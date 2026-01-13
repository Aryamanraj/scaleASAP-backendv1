import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { DocumentsService } from '../../../documents/documents.service';
import { ClaimWriterService } from '../claim-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { Claim } from '../../../repo/entities/claim.entity';
import {
  CoreIdentityEnricherInput,
  CoreIdentityPayload,
} from '../../../common/interfaces/module-inputs.interface';
import { ClaimType, DocumentSource } from '../../../common/types/claim-types';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class CoreIdentityEnricherHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentsService: DocumentsService,
    private claimWriterService: ClaimWriterService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CoreIdentityEnricherHandler.execute: Processing module run`,
        {
          moduleRunId: run.ModuleRunID,
          projectId: run.ProjectID,
          personId: run.PersonID,
        },
      );

      // Parse input config
      const input: CoreIdentityEnricherInput = run.InputConfigJson;
      const documentSource = input.documentSource || DocumentSource.MANUAL;
      const documentKind = input.documentKind;
      const schemaVersion = input.schemaVersion;

      if (!schemaVersion) {
        throw new Error('schemaVersion is required in InputConfigJson');
      }

      if (!documentKind) {
        throw new Error('documentKind is required in InputConfigJson');
      }

      // Fetch latest valid document by source and kind
      const document = await Promisify<Document>(
        this.documentsService.getLatestValidDocument({
          projectId: run.ProjectID,
          personId: run.PersonID,
          source: documentSource,
          documentKind: documentKind,
        }),
      );

      this.logger.info(
        `CoreIdentityEnricherHandler.execute: Found document [documentId=${document.DocumentID}, capturedAt=${document.CapturedAt}]`,
      );

      // Read payload
      const payload: CoreIdentityPayload = document.PayloadJson;

      if (!payload) {
        throw new Error('Document has no PayloadJson');
      }

      const claimsCreated: number[] = [];

      // Extract and create claims for legal name
      if (payload.legalName) {
        const claim = await Promisify<Claim>(
          this.claimWriterService.insertClaimAndSupersedePrevious({
            ProjectID: run.ProjectID,
            PersonID: run.PersonID,
            ClaimType: ClaimType.CORE_IDENTITY_LEGAL_NAME,
            GroupKey: null,
            ValueJson: payload.legalName,
            Confidence: 0.9,
            ObservedAt: document.CapturedAt,
            ValidFrom: null,
            ValidTo: null,
            SourceDocumentID: document.DocumentID,
            ModuleRunID: run.ModuleRunID,
            SchemaVersion: schemaVersion,
          }),
        );
        claimsCreated.push(claim.ClaimID);
        this.logger.info(`Created legal name claim: ${claim.ClaimID}`);
      }

      // Extract and create claims for location
      if (payload.location) {
        const claim = await Promisify<Claim>(
          this.claimWriterService.insertClaimAndSupersedePrevious({
            ProjectID: run.ProjectID,
            PersonID: run.PersonID,
            ClaimType: ClaimType.CORE_IDENTITY_LOCATION,
            GroupKey: null,
            ValueJson: payload.location,
            Confidence: 0.9,
            ObservedAt: document.CapturedAt,
            ValidFrom: null,
            ValidTo: null,
            SourceDocumentID: document.DocumentID,
            ModuleRunID: run.ModuleRunID,
            SchemaVersion: schemaVersion,
          }),
        );
        claimsCreated.push(claim.ClaimID);
        this.logger.info(`Created location claim: ${claim.ClaimID}`);
      }

      // Extract and create claims for education items
      if (payload.education && Array.isArray(payload.education)) {
        for (const edu of payload.education) {
          if (!edu.school || !edu.degree) {
            this.logger.warn(
              'Skipping education item missing school or degree',
              { edu },
            );
            continue;
          }

          const groupKey = `${edu.school}|${edu.degree}|${
            edu.startYear ?? ''
          }|${edu.endYear ?? ''}`;

          const claim = await Promisify<Claim>(
            this.claimWriterService.insertClaimAndSupersedePrevious({
              ProjectID: run.ProjectID,
              PersonID: run.PersonID,
              ClaimType: ClaimType.CORE_IDENTITY_EDUCATION_ITEM,
              GroupKey: groupKey,
              ValueJson: edu,
              Confidence: 0.9,
              ObservedAt: document.CapturedAt,
              ValidFrom: null,
              ValidTo: null,
              SourceDocumentID: document.DocumentID,
              ModuleRunID: run.ModuleRunID,
              SchemaVersion: schemaVersion,
            }),
          );
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `Created education claim: ${claim.ClaimID} - ${groupKey}`,
          );
        }
      }

      // Extract and create claims for career roles
      if (payload.career && Array.isArray(payload.career)) {
        for (const role of payload.career) {
          if (!role.company || !role.title) {
            this.logger.warn(
              `Skipping career role missing company or title [role=${JSON.stringify(
                role,
              )}]`,
            );
            continue;
          }

          const groupKey = `${role.company}|${role.title}|${
            role.startDate ?? ''
          }`;

          const claim = await Promisify<Claim>(
            this.claimWriterService.insertClaimAndSupersedePrevious({
              ProjectID: run.ProjectID,
              PersonID: run.PersonID,
              ClaimType: ClaimType.CORE_IDENTITY_CAREER_ROLE,
              GroupKey: groupKey,
              ValueJson: role,
              Confidence: 0.9,
              ObservedAt: document.CapturedAt,
              ValidFrom: null,
              ValidTo: null,
              SourceDocumentID: document.DocumentID,
              ModuleRunID: run.ModuleRunID,
              SchemaVersion: schemaVersion,
            }),
          );
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `Created career claim: ${claim.ClaimID} - ${groupKey}`,
          );
        }
      }

      // Extract and create claims for certifications
      if (payload.certifications && Array.isArray(payload.certifications)) {
        for (const cert of payload.certifications) {
          if (!cert.name) {
            this.logger.warn(
              `Skipping certification missing name [cert=${JSON.stringify(
                cert,
              )}]`,
            );
            continue;
          }

          const groupKey = `${cert.name}|${cert.issuer ?? ''}|${
            cert.year ?? ''
          }`;

          const claim = await Promisify<Claim>(
            this.claimWriterService.insertClaimAndSupersedePrevious({
              ProjectID: run.ProjectID,
              PersonID: run.PersonID,
              ClaimType: ClaimType.CORE_IDENTITY_CERTIFICATION,
              GroupKey: groupKey,
              ValueJson: cert,
              Confidence: 0.9,
              ObservedAt: document.CapturedAt,
              ValidFrom: null,
              ValidTo: null,
              SourceDocumentID: document.DocumentID,
              ModuleRunID: run.ModuleRunID,
              SchemaVersion: schemaVersion,
            }),
          );
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `Created certification claim: ${claim.ClaimID} - ${groupKey}`,
          );
        }
      }

      this.logger.info(
        `CoreIdentityEnricherHandler.execute: Successfully created ${
          claimsCreated.length
        } claims [claimIds=${JSON.stringify(claimsCreated)}]`,
      );

      return {
        error: null,
        data: { claimsCreated: claimsCreated.length, claimIds: claimsCreated },
      };
    } catch (error) {
      this.logger.error(
        `CoreIdentityEnricherHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

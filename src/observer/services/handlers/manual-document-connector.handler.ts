import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { DocumentRepoService } from '../../../repo/document-repo.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { sha256Hex } from '../../../common/helpers/sha256';
import {
  ManualDocumentConnectorInput,
  CoreIdentityPayload,
} from '../../../common/interfaces/module-inputs.interface';
import { DocumentSource } from '../../../common/types/claim-types';

@Injectable()
export class ManualDocumentConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentRepoService: DocumentRepoService,
  ) {}

  async execute(run: ModuleRun): Promise<{ error: any; data: any }> {
    try {
      this.logger.info(
        `ManualDocumentConnectorHandler.execute: Processing module run`,
        {
          moduleRunId: run.ModuleRunID,
          projectId: run.ProjectID,
          personId: run.PersonID,
        },
      );

      // Parse input config
      const input: ManualDocumentConnectorInput = run.InputConfigJson;

      // Validate payload exists
      if (!input.payload) {
        throw new Error('Payload is required in InputConfigJson');
      }

      // Validate source
      if (input.source !== DocumentSource.MANUAL) {
        throw new Error(
          `Invalid source: ${input.source}. Must be ${DocumentSource.MANUAL}`,
        );
      }

      // Calculate hash
      const payloadString = JSON.stringify(input.payload);
      const hash = sha256Hex(payloadString);

      // Determine capturedAt
      const capturedAt = input.capturedAt
        ? new Date(input.capturedAt)
        : new Date();

      // Create document
      const documentData = {
        ProjectID: run.ProjectID,
        PersonID: run.PersonID,
        Source: input.source,
        SourceRef: null,
        ContentType: input.contentType,
        StorageUri: 'inline://document',
        Hash: hash,
        CapturedAt: capturedAt,
        ModuleRunID: run.ModuleRunID,
        PayloadJson: input.payload,
      };

      const document = await Promisify<Document>(
        this.documentRepoService.create(documentData),
      );

      this.logger.info(
        `ManualDocumentConnectorHandler.execute: Document created successfully`,
        {
          documentId: document.DocumentID,
          hash,
        },
      );

      return { error: null, data: { documentId: document.DocumentID } };
    } catch (error) {
      this.logger.error('ManualDocumentConnectorHandler.execute: Error', {
        error: error.message,
        stack: error.stack,
        moduleRunId: run.ModuleRunID,
      });
      return { error: error, data: null };
    }
  }
}

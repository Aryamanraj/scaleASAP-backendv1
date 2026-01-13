import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ClaimWriterService } from '../claim-writer.service';
import { LayerSnapshotWriterService } from '../layer-snapshot-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Claim } from '../../../repo/entities/claim.entity';
import { LayerSnapshot } from '../../../repo/entities/layer-snapshot.entity';
import { Layer1ComposerInput } from '../../../common/interfaces/module-inputs.interface';
import { ClaimType } from '../../../common/types/claim-types';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class Layer1ComposerHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private claimWriterService: ClaimWriterService,
    private layerSnapshotWriterService: LayerSnapshotWriterService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(`Layer1ComposerHandler.execute: Processing module run`, {
        moduleRunId: run.ModuleRunID,
        projectId: run.ProjectID,
        personId: run.PersonID,
      });

      // Parse input config
      const input: Layer1ComposerInput = run.InputConfigJson;
      const layerNumber = input.layerNumber || 1;
      const schemaVersion = input.schemaVersion;

      if (!schemaVersion) {
        throw new Error('schemaVersion is required in InputConfigJson');
      }

      // Fetch active claims for core identity types
      const claimTypes = [
        ClaimType.CORE_IDENTITY_LEGAL_NAME,
        ClaimType.CORE_IDENTITY_LOCATION,
        ClaimType.CORE_IDENTITY_EDUCATION_ITEM,
        ClaimType.CORE_IDENTITY_CAREER_ROLE,
        ClaimType.CORE_IDENTITY_CERTIFICATION,
      ];

      const claims = await Promisify<Claim[]>(
        this.claimWriterService.getActiveClaims(
          run.ProjectID,
          run.PersonID,
          claimTypes,
        ),
      );

      this.logger.info(
        `Layer1ComposerHandler.execute: Found ${claims.length} active claims`,
      );

      // Compile snapshot
      const coreIdentity: any = {
        legalName: null,
        location: null,
        education: [],
        career: [],
        certifications: [],
      };

      for (const claim of claims) {
        switch (claim.ClaimType) {
          case ClaimType.CORE_IDENTITY_LEGAL_NAME:
            coreIdentity.legalName = claim.ValueJson;
            break;
          case ClaimType.CORE_IDENTITY_LOCATION:
            coreIdentity.location = claim.ValueJson;
            break;
          case ClaimType.CORE_IDENTITY_EDUCATION_ITEM:
            coreIdentity.education.push(claim.ValueJson);
            break;
          case ClaimType.CORE_IDENTITY_CAREER_ROLE:
            coreIdentity.career.push(claim.ValueJson);
            break;
          case ClaimType.CORE_IDENTITY_CERTIFICATION:
            coreIdentity.certifications.push(claim.ValueJson);
            break;
        }
      }

      const compiledJson = {
        layer: layerNumber,
        schemaVersion: schemaVersion,
        coreIdentity: coreIdentity,
        generatedAt: new Date().toISOString(),
      };

      // Create layer snapshot
      const snapshot = await Promisify<LayerSnapshot>(
        this.layerSnapshotWriterService.createNextSnapshotVersion({
          ProjectID: run.ProjectID,
          PersonID: run.PersonID,
          LayerNumber: layerNumber,
          ComposerModuleKey: 'layer-1-composer',
          ComposerVersion: run.ModuleVersion,
          CompiledJson: compiledJson,
          GeneratedAt: new Date(),
          ModuleRunID: run.ModuleRunID,
        }),
      );

      this.logger.info(
        `Layer1ComposerHandler.execute: Layer snapshot created successfully`,
        {
          layerSnapshotId: snapshot.LayerSnapshotID,
          snapshotVersion: snapshot.SnapshotVersion,
          layerNumber: snapshot.LayerNumber,
        },
      );

      return {
        error: null,
        data: {
          layerSnapshotId: snapshot.LayerSnapshotID,
          snapshotVersion: snapshot.SnapshotVersion,
        },
      };
    } catch (error) {
      this.logger.error('Layer1ComposerHandler.execute: Error', {
        error: error.message,
        stack: error.stack,
        moduleRunId: run.ModuleRunID,
      });
      return { error: error, data: null };
    }
  }
}

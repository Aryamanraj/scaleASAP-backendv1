import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ApifyService } from '../../../observer/services/apify.service';
import { LinkedinDocumentWriterService } from '../../../observer/services/linkedin-document-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import {
  DEFAULT_LINKEDIN_PROFILE_ACTOR,
  LINKEDIN_DOCUMENT_TYPE,
} from '../../../common/constants/linkedin.constants';
import { LinkedinProfileConnectorInput } from '../../../common/interfaces/linkedin.interfaces';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class LinkedinProfileConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private apifyService: ApifyService,
    private linkedinDocumentWriter: LinkedinDocumentWriterService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Processing module run`,
        {
          moduleRunId: run.ModuleRunID,
          projectId: run.ProjectID,
          personId: run.PersonID,
        },
      );

      // Validate InputConfigJson exists
      if (!run?.InputConfigJson) {
        throw new Error(
          'Missing InputConfigJson for linkedin-profile-connector',
        );
      }

      // Parse input config
      const input: LinkedinProfileConnectorInput = run.InputConfigJson;

      if (!input.profileUrl) {
        throw new Error('Missing profileUrl in InputConfigJson');
      }

      const profileUrl = input.profileUrl;
      const limit = input.limit ?? 1;
      const actorInputOverrides = input.actorInput ?? {};
      const actorId = input.actorId || DEFAULT_LINKEDIN_PROFILE_ACTOR;

      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Profile URL=${profileUrl}, limit=${limit}`,
      );

      // Build base actor input expected by apimaestro/linkedin-profile-full-sections-scraper
      // Actor expects: { usernames: [...] }
      const baseActorInput = {
        usernames: [profileUrl],
      };

      // Merge with any custom actor input overrides
      // If actorInputOverrides.usernames exists, it will take precedence
      const actorInput = { ...baseActorInput, ...actorInputOverrides };

      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Actor input=${JSON.stringify(
          actorInput,
        )}`,
      );

      // Run Apify actor and fetch dataset
      const result = await Promisify<{
        run: any;
        items: any[];
      }>(this.apifyService.runActorAndFetchDataset(actorId, actorInput, limit));

      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Apify run completed [runId=${result.run.id}, items=${result.items.length}]`,
      );

      // Write document
      const document = await Promisify<Document>(
        this.linkedinDocumentWriter.writeLinkedinDocument({
          projectId: run.ProjectID,
          personId: run.PersonID,
          documentType: LINKEDIN_DOCUMENT_TYPE.PROFILE,
          sourceRef: result.run.id,
          storageUri: `apify://dataset/${result.run.defaultDatasetId}`,
          payloadJson: result.items,
          moduleRunId: run.ModuleRunID,
          metaJson: {
            actorId,
            datasetId: result.run.defaultDatasetId,
          },
        }),
      );

      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Successfully created document [DocumentID=${document.DocumentID}]`,
      );

      return {
        error: null,
        data: {
          documentId: document.DocumentID,
          apifyRunId: result.run.id,
          itemCount: result.items.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `LinkedinProfileConnectorHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ApifyService } from '../../../observer/services/apify.service';
import { LinkedinDocumentWriterService } from '../../../observer/services/linkedin-document-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import {
  DEFAULT_LINKEDIN_POSTS_ACTOR,
  LINKEDIN_DOCUMENT_TYPE,
} from '../../../common/constants/linkedin.constants';
import { LinkedinPostsConnectorInput } from '../../../common/interfaces/linkedin.interfaces';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class LinkedinPostsConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private apifyService: ApifyService,
    private linkedinDocumentWriter: LinkedinDocumentWriterService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinPostsConnectorHandler.execute: Processing module run`,
        {
          moduleRunId: run.ModuleRunID,
          projectId: run.ProjectID,
          personId: run.PersonID,
        },
      );

      // Validate InputConfigJson exists
      if (!run?.InputConfigJson) {
        throw new Error('Missing InputConfigJson for linkedin-posts-connector');
      }

      // Parse input config
      const input: LinkedinPostsConnectorInput = run.InputConfigJson;

      if (!input.profileUrl) {
        throw new Error('Missing profileUrl in InputConfigJson');
      }

      const profileUrl = input.profileUrl;
      const totalPosts = input.totalPosts ?? null;
      const perPageLimit = input.limit ?? 100;
      const actorInputOverrides = input.actorInput ?? {};
      const actorId = input.actorId || DEFAULT_LINKEDIN_POSTS_ACTOR;

      this.logger.info(
        `LinkedinPostsConnectorHandler.execute: Profile URL=${profileUrl}, totalPosts=${totalPosts}, perPageLimit=${perPageLimit}`,
      );

      // Build base actor input for apimaestro/linkedin-profile-posts
      // Actor expects: username (required), and either limit (1-100) or total_posts (1-10000)
      const baseActorInput: any = {
        username: profileUrl, // Actor accepts username or profile URL
      };

      // Set pagination control - prefer total_posts if specified, otherwise use limit
      if (totalPosts !== null) {
        baseActorInput.total_posts = totalPosts;
      } else {
        baseActorInput.limit = perPageLimit;
      }

      // Merge with any custom actor input overrides
      const actorInput = { ...baseActorInput, ...actorInputOverrides };

      this.logger.info(
        `LinkedinPostsConnectorHandler.execute: Actor input=${JSON.stringify(
          actorInput,
        )}`,
      );

      // Run Apify actor and fetch dataset (no limit on dataset fetch - rely on actor pagination)
      const result = await Promisify<{
        run: any;
        items: any[];
      }>(this.apifyService.runActorAndFetchDataset(actorId, actorInput));

      this.logger.info(
        `LinkedinPostsConnectorHandler.execute: Apify run completed [runId=${result.run.id}, items=${result.items.length}]`,
      );

      // Write document
      const document = await Promisify<Document>(
        this.linkedinDocumentWriter.writeLinkedinDocument({
          projectId: run.ProjectID,
          personId: run.PersonID,
          documentType: LINKEDIN_DOCUMENT_TYPE.POSTS,
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
        `LinkedinPostsConnectorHandler.execute: Successfully created document [DocumentID=${document.DocumentID}]`,
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
        `LinkedinPostsConnectorHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

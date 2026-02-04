import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { LinkedinDocumentWriterService } from '../../../observer/services/linkedin-document-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { LINKEDIN_DOCUMENT_TYPE } from '../../../common/constants/linkedin.constants';
import { LinkedinPostsConnectorInput } from '../../../common/interfaces/linkedin.interfaces';
import { ResultWithError } from '../../../common/interfaces';
import { LinkedinProvider } from '../../../scraper/providers/linkedin.provider';
import { ScrapeProfileResponse } from '../../../common/interfaces/linkedin-scraper.interfaces';

@Injectable()
export class LinkedinPostsConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private linkedinDocumentWriter: LinkedinDocumentWriterService,
    private linkedinProvider: LinkedinProvider,
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
      this.logger.info(
        `LinkedinPostsConnectorHandler.execute: Scraping posts from profile URL=${profileUrl}`,
      );

      const scrapeResponse = await Promisify<ScrapeProfileResponse>(
        this.linkedinProvider.scrapeProfiles({ urls: [profileUrl] }),
      );

      const firstResult = scrapeResponse.results?.[0];
      if (!firstResult || !firstResult.success || !firstResult.data) {
        throw new Error(
          `LinkedIn scraper returned no data for profileUrl=${profileUrl}`,
        );
      }

      const recentPosts = firstResult.data.recentPosts || [];

      // Write document
      const document = await Promisify<Document>(
        this.linkedinDocumentWriter.writeLinkedinDocument({
          projectId: run.ProjectID,
          personId: run.PersonID,
          documentType: LINKEDIN_DOCUMENT_TYPE.POSTS,
          sourceRef: firstResult.data.profileUrn || profileUrl,
          storageUri: 'inline://linkedin-scraper',
          payloadJson: {
            recentPosts,
            profileUrl: firstResult.data.profileUrl,
            scrapedAt: firstResult.data.scrapedAt,
          },
          moduleRunId: run.ModuleRunID,
          metaJson: {
            source: 'linkedin-scraper',
            scrapedAt: firstResult.scrapedAt,
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
          itemCount: recentPosts.length,
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

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { LinkedinDocumentWriterService } from '../../../observer/services/linkedin-document-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { LINKEDIN_DOCUMENT_TYPE } from '../../../common/constants/linkedin.constants';
import { LinkedinProfileConnectorInput } from '../../../common/interfaces/linkedin.interfaces';
import { ResultWithError } from '../../../common/interfaces';
import { LinkedinProvider } from '../../../scraper/providers/linkedin.provider';
import { ScrapeProfileResponse } from '../../../common/interfaces/linkedin-scraper.interfaces';
import { PersonRepoService } from '../../../repo/person-repo.service';
import { FlowRunRepoService } from '../../../repo/flow-run-repo.service';
import { FlowRun } from '../../../repo/entities/flow-run.entity';
import { AIService } from '../../../ai/ai.service';
import { AI_MODEL, AI_PROVIDER, AI_TASK } from '../../../common/types/ai.types';
import {
  buildFlowFilterPrompt,
  FlowFilterEvidence,
} from '../../../ai/prompts/flow-filter.prompt';

@Injectable()
export class LinkedinProfileConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private linkedinDocumentWriter: LinkedinDocumentWriterService,
    private linkedinProvider: LinkedinProvider,
    private personRepoService: PersonRepoService,
    private flowRunRepoService: FlowRunRepoService,
    private aiService: AIService,
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
      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Scraping profile URL=${profileUrl}`,
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

      // Write profile document
      const profileDocument = await Promisify<Document>(
        this.linkedinDocumentWriter.writeLinkedinDocument({
          projectId: run.ProjectID,
          personId: run.PersonID,
          documentType: LINKEDIN_DOCUMENT_TYPE.PROFILE,
          sourceRef: firstResult.data.profileUrn || profileUrl,
          storageUri: 'inline://linkedin-scraper',
          payloadJson: firstResult.data,
          moduleRunId: run.ModuleRunID,
          metaJson: {
            source: 'linkedin-scraper',
            scrapedAt: firstResult.scrapedAt,
          },
        }),
      );

      this.logger.info(
        `LinkedinProfileConnectorHandler.execute: Successfully created profile document [DocumentID=${profileDocument.DocumentID}]`,
      );

      // Write posts document
      const recentPosts = firstResult.data.recentPosts || [];
      const postsDocument = await Promisify<Document>(
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
        `LinkedinProfileConnectorHandler.execute: Successfully created posts document [DocumentID=${postsDocument.DocumentID}, postsCount=${recentPosts.length}]`,
      );

      const flowRunId = run.InputConfigJson?._flowRunId;
      if (flowRunId) {
        const flowRun = await Promisify<FlowRun>(
          this.flowRunRepoService.get(
            { where: { FlowRunID: flowRunId } },
            true,
          ),
        );

        const filterInstructions =
          flowRun.InputSummaryJson?.filterInstructions || null;

        if (filterInstructions && !flowRun.InputSummaryJson?.filterResult) {
          const evidence: FlowFilterEvidence = {
            profile: firstResult.data,
            recentPosts: recentPosts.map((post: any) => ({
              postUrl: post.postUrl || post.url || null,
              text: post.text || post.content || null,
              createdAt: post.createdAt || null,
            })),
            recentReposts: (firstResult.data.recentReposts || []).map(
              (post: any) => ({
                postUrl: post.postUrl || post.url || null,
                text: post.text || post.content || null,
                createdAt: post.createdAt || null,
              }),
            ),
            filterInstructions,
          };

          const prompt = buildFlowFilterPrompt(evidence);
          const aiResponse = await this.aiService.run({
            provider: AI_PROVIDER.OPENAI,
            model: AI_MODEL.GPT_4O_MINI,
            taskType: AI_TASK.FLOW_FILTER,
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            temperature: 0,
            maxTokens: 300,
          });

          const filterResult = this.parseJsonResponse(aiResponse.rawText);

          await Promisify(
            this.flowRunRepoService.update(
              { FlowRunID: flowRunId },
              {
                InputSummaryJson: {
                  ...flowRun.InputSummaryJson,
                  filterResult,
                },
              },
            ),
          );

          if (filterResult?.shouldProceed === false) {
            throw new Error(`Filtered out: ${filterResult.reason}`);
          }
        }
      }

      // Update Person entity with scraped profile data
      const profileData = firstResult.data;
      const personUpdateData: any = {};

      if (profileData.firstName) {
        personUpdateData.FirstName = profileData.firstName;
      }
      if (profileData.lastName) {
        personUpdateData.LastName = profileData.lastName;
      }
      if (profileData.fullName) {
        personUpdateData.PrimaryDisplayName = profileData.fullName;
      }
      if (profileData.headline) {
        personUpdateData.Headline = profileData.headline;
      }
      if (profileData.profileUrn) {
        personUpdateData.ExternalUrn = profileData.profileUrn;
      }

      if (Object.keys(personUpdateData).length > 0) {
        await Promisify(
          this.personRepoService.update(
            { PersonID: run.PersonID },
            personUpdateData,
          ),
        );

        this.logger.info(
          `LinkedinProfileConnectorHandler.execute: Updated person record [PersonID=${
            run.PersonID
          }, fields=${Object.keys(personUpdateData).join(', ')}]`,
        );
      }

      return {
        error: null,
        data: {
          profileDocumentId: profileDocument.DocumentID,
          postsDocumentId: postsDocument.DocumentID,
          postsCount: recentPosts.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `LinkedinProfileConnectorHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }

  private parseJsonResponse(rawText: string): any {
    try {
      return JSON.parse(rawText);
    } catch (error) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw error;
    }
  }
}

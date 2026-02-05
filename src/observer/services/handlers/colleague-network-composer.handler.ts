import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { DocumentsService } from '../../../documents/documents.service';
import { AIService } from '../../../ai/ai.service';
import { ClaimWriterService } from '../claim-writer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { Claim } from '../../../repo/entities/claim.entity';
import { ResultWithError } from '../../../common/interfaces';
import { DocumentSource } from '../../../common/types/claim-types';
import { DocumentKind } from '../../../common/types/document.types';
import { CLAIM_KEY } from '../../../common/types/claim-types';
import { AI_PROVIDER, AI_MODEL, AI_TASK } from '../../../common/types/ai.types';
import {
  buildColleagueNetworkPrompt,
  ColleagueNetworkEvidence,
} from '../../../ai/prompts/colleague-network.prompt';
import { ColleagueNetworkComposerInput } from '../../../common/interfaces/module-inputs.interface';

@Injectable()
export class ColleagueNetworkComposerHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentsService: DocumentsService,
    private aiService: AIService,
    private claimWriterService: ClaimWriterService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ColleagueNetworkComposerHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const input: ColleagueNetworkComposerInput = run.InputConfigJson || {};
      const schemaVersion = input.schemaVersion || 'v1';

      const profileDocument = await Promisify<Document>(
        this.documentsService.getLatestValidDocument({
          projectId: run.ProjectID,
          personId: run.PersonID,
          source: DocumentSource.LINKEDIN,
          documentKind: DocumentKind.LINKEDIN_PROFILE,
        }),
      );

      let postsDocument: Document | null = null;
      try {
        postsDocument = await Promisify<Document>(
          this.documentsService.getLatestValidDocument({
            projectId: run.ProjectID,
            personId: run.PersonID,
            source: DocumentSource.LINKEDIN,
            documentKind: DocumentKind.LINKEDIN_POSTS,
          }),
        );
      } catch {
        postsDocument = null;
      }

      const profilePayload = Array.isArray(profileDocument.PayloadJson)
        ? profileDocument.PayloadJson[0]
        : profileDocument.PayloadJson;

      const postsPayload = postsDocument?.PayloadJson || {};
      const recentPosts = Array.isArray(postsPayload)
        ? postsPayload
        : postsPayload?.recentPosts || [];
      const recentReposts = Array.isArray(profilePayload?.recentReposts)
        ? profilePayload.recentReposts
        : postsPayload?.recentReposts || [];

      const evidence: ColleagueNetworkEvidence = {
        profile: {
          ...(profilePayload || {}),
          experience: profilePayload?.experience || [],
        },
        recentPosts: recentPosts.map((post: any) => ({
          postUrl: post.postUrl || post.url || null,
          text: post.text || post.content || null,
          createdAt: post.createdAt || null,
        })),
        recentReposts: recentReposts.map((post: any) => ({
          postUrl: post.postUrl || post.url || null,
          text: post.text || post.content || null,
          createdAt: post.createdAt || null,
        })),
      };

      const prompt = buildColleagueNetworkPrompt(evidence);
      this.logger.info(
        'ColleagueNetworkComposerHandler.execute: AI prompt payload',
        {
          moduleRunId: run.ModuleRunID,
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
        },
      );
      this.logger.info(
        `ColleagueNetworkComposerHandler.execute: AI prompt payload JSON=${JSON.stringify(
          {
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
          },
        )}`,
      );

      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O_MINI,
        taskType: AI_TASK.COLLEAGUE_NETWORK_INFERENCE,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      this.logger.info(
        'ColleagueNetworkComposerHandler.execute: AI raw response',
        {
          moduleRunId: run.ModuleRunID,
          rawText: aiResponse.rawText,
        },
      );
      this.logger.info(
        `ColleagueNetworkComposerHandler.execute: AI raw response JSON=${JSON.stringify(
          { rawText: aiResponse.rawText },
        )}`,
      );

      const parsed = await this.parseJsonResponseWithRetry(
        aiResponse.rawText,
        prompt.systemPrompt,
        prompt.userPrompt,
        run.ModuleRunID,
      );

      const valueJsonWithMeta = {
        ...parsed,
        _meta: {
          moduleRunId: run.ModuleRunID,
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed || 0,
          sourceDocumentId: profileDocument.DocumentID,
          postsDocumentId: postsDocument?.DocumentID || null,
          schemaVersion,
        },
      };

      const claim = await Promisify<Claim>(
        this.claimWriterService.insertClaimAndSupersedePrevious({
          ProjectID: run.ProjectID,
          PersonID: run.PersonID,
          ClaimType: CLAIM_KEY.INSIGHTS_COLLEAGUE_NETWORK,
          GroupKey: 'single',
          ValueJson: valueJsonWithMeta,
          Confidence: 0.6,
          ObservedAt: profileDocument.CapturedAt || new Date(),
          ValidFrom: null,
          ValidTo: null,
          SourceDocumentID: profileDocument.DocumentID,
          ModuleRunID: run.ModuleRunID,
          SchemaVersion: schemaVersion,
        }),
      );

      this.logger.info(
        `ColleagueNetworkComposerHandler.execute: Created claim [claimId=${claim.ClaimID}]`,
      );

      return {
        error: null,
        data: {
          claimId: claim.ClaimID,
        },
      };
    } catch (error) {
      this.logger.error(
        `ColleagueNetworkComposerHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
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

  private async parseJsonResponseWithRetry(
    rawText: string,
    systemPrompt: string,
    userPrompt: string,
    moduleRunId: number,
  ): Promise<any> {
    try {
      return this.parseJsonResponse(rawText);
    } catch (error) {
      this.logger.warn(
        `ColleagueNetworkComposerHandler.execute: Invalid JSON response, retrying with follow-up prompt [moduleRunId=${moduleRunId}, error=${error.message}]`,
      );

      const followUpPrompt = `${userPrompt}\n\nYour previous response was invalid JSON. Fix it and return ONLY valid JSON with the same schema. Do not add commentary.\n\nInvalid response:\n${rawText}`;

      const retryResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O_MINI,
        taskType: AI_TASK.COLLEAGUE_NETWORK_INFERENCE,
        systemPrompt,
        userPrompt: followUpPrompt,
        temperature: 0,
        maxTokens: 500,
      });

      this.logger.info(
        'ColleagueNetworkComposerHandler.execute: AI retry raw response',
        {
          moduleRunId,
          rawText: retryResponse.rawText,
        },
      );
      this.logger.info(
        `ColleagueNetworkComposerHandler.execute: AI retry raw response JSON=${JSON.stringify(
          { rawText: retryResponse.rawText },
        )}`,
      );

      return this.parseJsonResponse(retryResponse.rawText);
    }
  }
}

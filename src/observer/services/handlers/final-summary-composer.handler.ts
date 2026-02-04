import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { In, IsNull } from 'typeorm';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { DocumentsService } from '../../../documents/documents.service';
import { AIService } from '../../../ai/ai.service';
import { ClaimWriterService } from '../claim-writer.service';
import { ClaimRepoService } from '../../../repo/claim-repo.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { Claim } from '../../../repo/entities/claim.entity';
import { ResultWithError } from '../../../common/interfaces';
import { DocumentSource } from '../../../common/types/claim-types';
import { DocumentKind } from '../../../common/types/document.types';
import { CLAIM_KEY } from '../../../common/types/claim-types';
import { AI_PROVIDER, AI_MODEL, AI_TASK } from '../../../common/types/ai.types';
import {
  buildFinalSummaryPrompt,
  FinalSummaryEvidence,
} from '../../../ai/prompts/final-summary.prompt';
import { FinalSummaryComposerInput } from '../../../common/interfaces/module-inputs.interface';

const SUMMARY_CLAIM_TYPES = [
  CLAIM_KEY.INSIGHTS_DECISION_MAKER_BRAND,
  CLAIM_KEY.INSIGHTS_REVENUE_SIGNAL,
  CLAIM_KEY.INSIGHTS_LINKEDIN_ACTIVITY,
  CLAIM_KEY.INSIGHTS_COMPETITOR_MENTIONS,
  CLAIM_KEY.INSIGHTS_HIRING_SIGNALS,
  CLAIM_KEY.INSIGHTS_TOPIC_THEMES,
  CLAIM_KEY.INSIGHTS_TONE_SIGNALS,
  CLAIM_KEY.INSIGHTS_COLLEAGUE_NETWORK,
  CLAIM_KEY.INSIGHTS_EXTERNAL_SOCIALS,
  CLAIM_KEY.INSIGHTS_EVENT_ATTENDANCE,
  CLAIM_KEY.INSIGHTS_LOW_QUALITY_ENGAGEMENT,
  CLAIM_KEY.INSIGHTS_DESIGN_HELP_SIGNALS,
];

@Injectable()
export class FinalSummaryComposerHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentsService: DocumentsService,
    private aiService: AIService,
    private claimWriterService: ClaimWriterService,
    private claimRepoService: ClaimRepoService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `FinalSummaryComposerHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const input: FinalSummaryComposerInput = run.InputConfigJson || {};
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

      const claims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: run.ProjectID,
              PersonID: run.PersonID,
              ClaimType: In(SUMMARY_CLAIM_TYPES),
              SupersededAt: IsNull(),
            },
            order: { CreatedAt: 'DESC' },
          },
          false,
        ),
      );

      const latestClaimsByType = new Map<string, Claim>();
      for (const claim of claims) {
        if (!latestClaimsByType.has(claim.ClaimType)) {
          latestClaimsByType.set(claim.ClaimType, claim);
        }
      }

      const evidence: FinalSummaryEvidence = {
        profile: profilePayload || {},
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
        claims: Array.from(latestClaimsByType.values()).map((claim) => ({
          claimType: claim.ClaimType,
          value: claim.ValueJson,
        })),
      };

      const prompt = buildFinalSummaryPrompt(evidence);

      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O_MINI,
        taskType: AI_TASK.FINAL_SUMMARY_INFERENCE,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: 0.3,
        maxTokens: 700,
      });

      const parsed = this.parseJsonResponse(aiResponse.rawText);

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
          ClaimType: CLAIM_KEY.INSIGHTS_FINAL_SUMMARY,
          GroupKey: 'single',
          ValueJson: valueJsonWithMeta,
          Confidence: 0.7,
          ObservedAt: profileDocument.CapturedAt || new Date(),
          ValidFrom: null,
          ValidTo: null,
          SourceDocumentID: profileDocument.DocumentID,
          ModuleRunID: run.ModuleRunID,
          SchemaVersion: schemaVersion,
        }),
      );

      this.logger.info(
        `FinalSummaryComposerHandler.execute: Created claim [claimId=${claim.ClaimID}]`,
      );

      return {
        error: null,
        data: {
          claimId: claim.ClaimID,
        },
      };
    } catch (error) {
      this.logger.error(
        `FinalSummaryComposerHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
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

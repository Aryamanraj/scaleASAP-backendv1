import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ContentChunk } from '../../../repo/entities/content-chunk.entity';
import { ContentChunkItem } from '../../../repo/entities/content-chunk-item.entity';
import { ChunkEvidence } from '../../../repo/entities/chunk-evidence.entity';
import { ContentChunkRepoService } from '../../../repo/content-chunk-repo.service';
import { ContentChunkItemRepoService } from '../../../repo/content-chunk-item-repo.service';
import { PostItemRepoService } from '../../../repo/post-item-repo.service';
import { ChunkEvidenceRepoService } from '../../../repo/chunk-evidence-repo.service';
import { AIService } from '../../../ai/ai.service';
import {
  CHUNK_STATUS,
  EVIDENCE_STATUS,
} from '../../../common/types/posts.types';
import {
  AI_TASK,
  AI_MODEL_OPENAI,
  AI_PROVIDER,
} from '../../../common/types/ai.types';
import { buildPostsChunkEvidencePrompt } from '../../../ai/prompts/posts-chunk-evidence.prompt';
import { Promisify } from '../../../common/helpers/promisifier';
import { IsNull, Not } from 'typeorm';
import { formatUtcYearMonth } from '../../../common/helpers/time';

interface ExtractConfig {
  projectId: number;
  personId: number;
  maxPostsPerChunk?: number;
}

@Injectable()
export class LinkedinPostsChunkEvidenceExtractorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private contentChunkRepoService: ContentChunkRepoService,
    private contentChunkItemRepoService: ContentChunkItemRepoService,
    private postItemRepoService: PostItemRepoService,
    private chunkEvidenceRepoService: ChunkEvidenceRepoService,
    private aiService: AIService,
  ) {}

  async extract(run: ModuleRun): Promise<any> {
    const config: ExtractConfig = {
      projectId: run.ProjectID,
      personId: run.PersonID,
      maxPostsPerChunk: run.InputConfigJson?.maxPostsPerChunk || 80,
    };

    this.logger.info(
      `LinkedinPostsChunkEvidenceExtractorService.extract started [projectId=${config.projectId}, personId=${config.personId}]`,
    );

    let processedChunks = 0;
    let successfulExtractions = 0;
    let failedExtractions = 0;

    try {
      // Find chunks that need evidence extraction
      const chunks = await Promisify<ContentChunk[]>(
        this.contentChunkRepoService.getAll(
          {
            where: {
              ProjectID: config.projectId,
              PersonID: config.personId,
              IsValid: true,
              Status: CHUNK_STATUS.POPULATED,
            },
          },
          false,
        ),
      );

      if (!chunks || chunks.length === 0) {
        this.logger.info(
          `LinkedinPostsChunkEvidenceExtractorService.extract: No chunks found [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { processedChunks: 0, successful: 0, failed: 0 };
      }

      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorService.extract: Found chunks [count=${chunks.length}]`,
      );

      // Filter chunks that need processing
      const chunksToProcess = [];
      for (const chunk of chunks) {
        const needsProcessing = await this.needsEvidenceExtraction(
          chunk.ContentChunkID,
        );
        if (needsProcessing) {
          chunksToProcess.push(chunk);
        }
      }

      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorService.extract: Chunks needing processing [count=${chunksToProcess.length}]`,
      );

      // Process each chunk
      for (const chunk of chunksToProcess) {
        try {
          await this.processChunk(chunk, config.maxPostsPerChunk);
          processedChunks++;
          successfulExtractions++;
        } catch (error) {
          this.logger.error(
            `LinkedinPostsChunkEvidenceExtractorService.extract: Failed to process chunk [chunkId=${chunk.ContentChunkID}, error=${error.message}]`,
          );
          failedExtractions++;
          // Continue processing other chunks
        }
      }

      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorService.extract completed [processed=${processedChunks}, successful=${successfulExtractions}, failed=${failedExtractions}]`,
      );

      return {
        processedChunks,
        successful: successfulExtractions,
        failed: failedExtractions,
      };
    } catch (error) {
      this.logger.error(
        `LinkedinPostsChunkEvidenceExtractorService.extract error [error=${error.message}, stack=${error.stack}]`,
      );
      throw error;
    }
  }

  private async needsEvidenceExtraction(chunkId: number): Promise<boolean> {
    const evidences = await Promisify<ChunkEvidence[]>(
      this.chunkEvidenceRepoService.getAll(
        {
          where: {
            ContentChunkID: chunkId,
          },
        },
        false,
      ),
    );

    // Needs extraction if no evidence exists OR status is not COMPLETED
    if (!evidences || evidences.length === 0) {
      return true;
    }

    const latestEvidence = evidences[0];
    return latestEvidence.Status !== EVIDENCE_STATUS.COMPLETED;
  }

  private async processChunk(chunk: any, maxPosts: number): Promise<void> {
    this.logger.info(
      `LinkedinPostsChunkEvidenceExtractorService.processChunk started [chunkId=${chunk.ContentChunkID}]`,
    );

    try {
      // Load chunk items
      const chunkItems = await Promisify<ContentChunkItem[]>(
        this.contentChunkItemRepoService.getAll(
          {
            where: {
              ContentChunkID: chunk.ContentChunkID,
            },
            relations: { PostItem: true },
            take: maxPosts,
          },
          false,
        ),
      );

      if (!chunkItems || chunkItems.length === 0) {
        throw new Error('No posts found for chunk');
      }

      // Build AI input
      const posts = chunkItems
        .map((item) => item.PostItem)
        .filter((post) => post)
        .map((post) => ({
          postedAt: post.PostedAt ? post.PostedAt.toISOString() : null,
          text: post.Text ? post.Text.substring(0, 500) : '[No text content]',
          engagement: post.EngagementJson || null,
        }));

      const chunkPeriod = this.getChunkPeriodLabel(chunk);

      const promptInput = {
        posts,
        chunkPeriod,
        totalPosts: chunk.PostCount,
      };

      const prompt = buildPostsChunkEvidencePrompt(promptInput);

      // Call AI service
      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorService.processChunk: Calling AI [chunkId=${chunk.ContentChunkID}, posts=${posts.length}]`,
      );

      const aiResult = await this.aiService.run<any>({
        provider: AI_PROVIDER.OPENAI,
        taskType: AI_TASK.POSTS_CHUNK_EVIDENCE_EXTRACTION,
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        model: AI_MODEL_OPENAI.GPT_4O,
        temperature: 0.3,
      });

      // Parse and store evidence
      let evidenceData: any;
      try {
        evidenceData =
          typeof aiResult.rawText === 'string'
            ? JSON.parse(aiResult.rawText)
            : aiResult.rawText;
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      // Add AI metadata to evidence
      const evidenceWithMeta = {
        ...evidenceData,
        _meta: {
          provider: aiResult.provider,
          model: aiResult.model,
          tokensUsed: aiResult.tokensUsed,
          extractedAt: new Date().toISOString(),
          chunkId: chunk.ContentChunkID,
          postsAnalyzed: posts.length,
          totalPostsInChunk: chunk.PostCount,
        },
      };

      // Check if evidence already exists
      const existingEvidences = await Promisify<ChunkEvidence[]>(
        this.chunkEvidenceRepoService.getAll(
          {
            where: {
              ContentChunkID: chunk.ContentChunkID,
            },
          },
          false,
        ),
      );

      if (existingEvidences && existingEvidences.length > 0) {
        // Update existing evidence
        await Promisify<ChunkEvidence>(
          this.chunkEvidenceRepoService.update(
            { ContentChunkID: chunk.ContentChunkID },
            {
              EvidenceJson: evidenceWithMeta,
              AIProvider: AI_PROVIDER.OPENAI,
              AIModel: aiResult.model,
              TokensUsed: aiResult.tokensUsed,
              Status: EVIDENCE_STATUS.COMPLETED,
              ErrorJson: null,
            },
          ),
        );
      } else {
        // Create new evidence
        await Promisify<ChunkEvidence>(
          this.chunkEvidenceRepoService.create({
            ContentChunkID: chunk.ContentChunkID,
            EvidenceJson: evidenceWithMeta,
            AIProvider: AI_PROVIDER.OPENAI,
            AIModel: aiResult.model,
            TokensUsed: aiResult.tokensUsed,
            Status: EVIDENCE_STATUS.COMPLETED,
            ErrorJson: null,
          }),
        );
      }

      // Update chunk status
      await Promisify<ContentChunk>(
        this.contentChunkRepoService.update(
          { ContentChunkID: chunk.ContentChunkID },
          {
            Status: CHUNK_STATUS.EVIDENCE_READY,
          },
        ),
      );

      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorService.processChunk completed [chunkId=${chunk.ContentChunkID}, tokensUsed=${aiResult.tokensUsed}]`,
      );
    } catch (error) {
      this.logger.error(
        `LinkedinPostsChunkEvidenceExtractorService.processChunk error [chunkId=${chunk.ContentChunkID}, error=${error.message}]`,
      );

      // Store error in ChunkEvidence
      const errorData = {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };

      const existingEvidences = await Promisify<ChunkEvidence[]>(
        this.chunkEvidenceRepoService.getAll(
          {
            where: {
              ContentChunkID: chunk.ContentChunkID,
            },
          },
          false,
        ),
      );

      if (existingEvidences && existingEvidences.length > 0) {
        await Promisify<ChunkEvidence>(
          this.chunkEvidenceRepoService.update(
            { ContentChunkID: chunk.ContentChunkID },
            {
              Status: EVIDENCE_STATUS.FAILED,
              ErrorJson: errorData as any,
            },
          ),
        );
      } else {
        await Promisify<ChunkEvidence>(
          this.chunkEvidenceRepoService.create({
            ContentChunkID: chunk.ContentChunkID,
            EvidenceJson: null,
            AIProvider: AI_PROVIDER.OPENAI,
            AIModel: AI_MODEL_OPENAI.GPT_4O,
            TokensUsed: null,
            Status: EVIDENCE_STATUS.FAILED,
            ErrorJson: errorData as any,
          }),
        );
      }

      throw error;
    }
  }

  private getChunkPeriodLabel(chunk: any): string {
    if (chunk.FromAt && chunk.ToAt) {
      const fromDate = new Date(chunk.FromAt);
      return formatUtcYearMonth(fromDate);
    }
    return chunk.Fingerprint.includes('undated') ? 'undated' : 'batch';
  }
}

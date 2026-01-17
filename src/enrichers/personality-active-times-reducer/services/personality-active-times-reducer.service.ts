import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ContentChunk } from '../../../repo/entities/content-chunk.entity';
import { ContentChunkItem } from '../../../repo/entities/content-chunk-item.entity';
import { PostItem } from '../../../repo/entities/post-item.entity';
import { ChunkEvidence } from '../../../repo/entities/chunk-evidence.entity';
import { Claim } from '../../../repo/entities/claim.entity';
import { ContentChunkRepoService } from '../../../repo/content-chunk-repo.service';
import { ContentChunkItemRepoService } from '../../../repo/content-chunk-item-repo.service';
import { PostItemRepoService } from '../../../repo/post-item-repo.service';
import { ChunkEvidenceRepoService } from '../../../repo/chunk-evidence-repo.service';
import { ClaimRepoService } from '../../../repo/claim-repo.service';
import { EVIDENCE_STATUS } from '../../../common/types/posts.types';
import { CLAIM_KEY } from '../../../common/types/claim-types';
import { Promisify } from '../../../common/helpers/promisifier';

interface ReducerConfig {
  projectId: number;
  personId: number;
}

interface HourHistogram {
  [hour: string]: number;
}

@Injectable()
export class PersonalityActiveTimesReducerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private contentChunkRepoService: ContentChunkRepoService,
    private contentChunkItemRepoService: ContentChunkItemRepoService,
    private postItemRepoService: PostItemRepoService,
    private chunkEvidenceRepoService: ChunkEvidenceRepoService,
    private claimRepoService: ClaimRepoService,
  ) {}

  async reduce(run: ModuleRun): Promise<any> {
    const config: ReducerConfig = {
      projectId: run.ProjectID,
      personId: run.PersonID,
    };

    this.logger.info(
      `PersonalityActiveTimesReducerService.reduce started [projectId=${config.projectId}, personId=${config.personId}]`,
    );

    try {
      // Find all completed chunk evidences
      const chunks = await Promisify<ContentChunk[]>(
        this.contentChunkRepoService.getAll(
          {
            where: {
              ProjectID: config.projectId,
              PersonID: config.personId,
              IsValid: true,
            },
          },
          false,
        ),
      );

      if (!chunks || chunks.length === 0) {
        this.logger.info(
          `PersonalityActiveTimesReducerService.reduce: No chunks found [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { claimsCreated: 0 };
      }

      // Get evidences for these chunks
      const evidences = await Promisify<ChunkEvidence[]>(
        this.chunkEvidenceRepoService.getAll(
          {
            where: {
              Status: EVIDENCE_STATUS.COMPLETED,
            },
          },
          false,
        ),
      );

      if (!evidences || evidences.length === 0) {
        this.logger.info(
          `PersonalityActiveTimesReducerService.reduce: No completed evidences found [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { claimsCreated: 0 };
      }

      // Filter evidences that belong to our chunks
      const chunkIds = new Set(chunks.map((c) => c.ContentChunkID));
      const relevantEvidences = evidences.filter((e) =>
        chunkIds.has(e.ContentChunkID),
      );

      if (relevantEvidences.length === 0) {
        this.logger.info(
          `PersonalityActiveTimesReducerService.reduce: No relevant evidences found [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { claimsCreated: 0 };
      }

      this.logger.info(
        `PersonalityActiveTimesReducerService.reduce: Found evidences [count=${relevantEvidences.length}]`,
      );

      // Collect all posts to analyze posting times
      const allPostIds: number[] = [];
      for (const chunk of chunks) {
        const chunkItems = await Promisify<ContentChunkItem[]>(
          this.contentChunkItemRepoService.getAll(
            {
              where: {
                ContentChunkID: chunk.ContentChunkID,
              },
            },
            false,
          ),
        );

        if (chunkItems) {
          allPostIds.push(...chunkItems.map((item) => item.PostItemID));
        }
      }

      // Fetch posts
      const posts = await Promisify<PostItem[]>(
        this.postItemRepoService.getAll(
          {
            where: allPostIds.map((id) => ({ PostItemID: id })),
          },
          false,
        ),
      );

      if (!posts || posts.length === 0) {
        this.logger.warn(
          `PersonalityActiveTimesReducerService.reduce: No posts found [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { claimsCreated: 0 };
      }

      // Build hour histogram
      const hourHistogram: HourHistogram = {};
      for (let i = 0; i < 24; i++) {
        hourHistogram[i.toString()] = 0;
      }

      let postsWithTime = 0;
      for (const post of posts) {
        if (post.PostedAt) {
          const postedDate = new Date(post.PostedAt);
          const hour = postedDate.getUTCHours();
          hourHistogram[hour.toString()]++;
          postsWithTime++;
        }
      }

      if (postsWithTime === 0) {
        this.logger.warn(
          `PersonalityActiveTimesReducerService.reduce: No posts with timestamps [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { claimsCreated: 0 };
      }

      // Calculate peak hours (top 3)
      const hourCounts = Object.entries(hourHistogram)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count);

      const peakHours = hourCounts
        .slice(0, 3)
        .filter((h) => h.count > 0)
        .map((h) => h.hour);

      // Determine confidence based on data volume
      let confidence: 'LOW' | 'MED' | 'HIGH';
      if (postsWithTime < 10) {
        confidence = 'LOW';
      } else if (postsWithTime < 30) {
        confidence = 'MED';
      } else {
        confidence = 'HIGH';
      }

      // Build ValueJson
      const valueJson = {
        hourHistogram,
        peakHours,
        confidence,
        _meta: {
          chunksUsed: relevantEvidences.length,
          evidenceIds: relevantEvidences.map((e) => e.ChunkEvidenceID),
          postsAnalyzed: postsWithTime,
          totalPosts: posts.length,
          moduleRunId: run.ModuleRunID,
        },
      };

      // Check if claim already exists
      const existingClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: config.projectId,
              PersonID: config.personId,
              ClaimType: CLAIM_KEY.PERSONALITY_ACTIVE_TIMES,
              GroupKey: 'single',
            },
            order: {
              CreatedAt: 'DESC',
            },
          },
          false,
        ),
      );

      // Create or update claim
      if (existingClaims && existingClaims.length > 0) {
        // Supersede existing claim
        const latestClaim = existingClaims[0];
        const newClaim = await Promisify<Claim>(
          this.claimRepoService.create({
            ProjectID: config.projectId,
            PersonID: config.personId,
            ClaimType: CLAIM_KEY.PERSONALITY_ACTIVE_TIMES,
            GroupKey: 'single',
            ValueJson: valueJson,
            Confidence:
              confidence === 'HIGH' ? 0.9 : confidence === 'MED' ? 0.7 : 0.5,
            ObservedAt: new Date(),
            ValidFrom: null,
            ValidTo: null,
            SourceDocumentID: null,
            ModuleRunID: run.ModuleRunID,
            SchemaVersion: 'v1',
          }),
        );

        // Mark old claim as superseded
        await Promisify<Claim>(
          this.claimRepoService.update(
            { ClaimID: latestClaim.ClaimID },
            {
              SupersededAt: new Date(),
              ReplacedByClaimID: newClaim.ClaimID,
            },
          ),
        );

        this.logger.info(
          `PersonalityActiveTimesReducerService.reduce: Claim created and superseded old claim [newClaimId=${newClaim.ClaimID}, oldClaimId=${latestClaim.ClaimID}]`,
        );
      } else {
        // Create new claim
        const newClaim = await Promisify<Claim>(
          this.claimRepoService.create({
            ProjectID: config.projectId,
            PersonID: config.personId,
            ClaimType: CLAIM_KEY.PERSONALITY_ACTIVE_TIMES,
            GroupKey: 'single',
            ValueJson: valueJson,
            Confidence:
              confidence === 'HIGH' ? 0.9 : confidence === 'MED' ? 0.7 : 0.5,
            ObservedAt: new Date(),
            ValidFrom: null,
            ValidTo: null,
            SourceDocumentID: null,
            ModuleRunID: run.ModuleRunID,
            SchemaVersion: 'v1',
          }),
        );

        this.logger.info(
          `PersonalityActiveTimesReducerService.reduce: New claim created [claimId=${newClaim?.ClaimID}]`,
        );
      }

      this.logger.info(
        `PersonalityActiveTimesReducerService.reduce completed [postsAnalyzed=${postsWithTime}, peakHours=${peakHours.join(
          ',',
        )}, confidence=${confidence}]`,
      );

      return {
        claimsCreated: 1,
        postsAnalyzed: postsWithTime,
        peakHours,
        confidence,
      };
    } catch (error) {
      this.logger.error(
        `PersonalityActiveTimesReducerService.reduce error [error=${error.message}, stack=${error.stack}]`,
      );
      throw error;
    }
  }
}

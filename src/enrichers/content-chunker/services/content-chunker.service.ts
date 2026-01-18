import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { PostItem } from '../../../repo/entities/post-item.entity';
import { ContentChunk } from '../../../repo/entities/content-chunk.entity';
import { ContentChunkItem } from '../../../repo/entities/content-chunk-item.entity';
import { PostItemRepoService } from '../../../repo/post-item-repo.service';
import { ContentChunkRepoService } from '../../../repo/content-chunk-repo.service';
import { ContentChunkItemRepoService } from '../../../repo/content-chunk-item-repo.service';
import {
  DATA_SOURCE,
  CHUNK_TYPE,
  CHUNK_STATUS,
} from '../../../common/types/posts.types';
import { Promisify } from '../../../common/helpers/promisifier';
import { createHash } from 'crypto';
import {
  getUtcYear,
  getUtcMonth,
  getUtcMonthStart,
  getUtcMonthEnd,
} from '../../../common/helpers/time';

interface ChunkConfig {
  projectId: number;
  personId: number;
  chunkType?: CHUNK_TYPE;
}

interface ChunkGroup {
  key: string;
  fromAt: Date | null;
  toAt: Date | null;
  postItemIds: number[];
}

@Injectable()
export class ContentChunkerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private postItemRepoService: PostItemRepoService,
    private contentChunkRepoService: ContentChunkRepoService,
    private contentChunkItemRepoService: ContentChunkItemRepoService,
  ) {}

  async chunk(run: ModuleRun): Promise<any> {
    const config: ChunkConfig = {
      projectId: run.ProjectID,
      personId: run.PersonID,
      chunkType: run.InputConfigJson?.chunkType || CHUNK_TYPE.MONTHLY,
    };

    this.logger.info(
      `ContentChunkerService.chunk started [projectId=${config.projectId}, personId=${config.personId}, chunkType=${config.chunkType}]`,
    );

    let totalChunksCreated = 0;
    let totalItemsLinked = 0;

    try {
      // Fetch all valid PostItems for this person
      const postItems = await Promisify<PostItem[]>(
        this.postItemRepoService.getAll(
          {
            where: {
              ProjectID: config.projectId,
              PersonID: config.personId,
              IsValid: true,
            },
            order: {
              PostedAt: 'ASC',
            },
          },
          false,
        ),
      );

      if (!postItems || postItems.length === 0) {
        this.logger.info(
          `ContentChunkerService.chunk: No posts found [projectId=${config.projectId}, personId=${config.personId}]`,
        );
        return { chunksCreated: 0, itemsLinked: 0 };
      }

      this.logger.info(
        `ContentChunkerService.chunk: Found posts [count=${postItems.length}]`,
      );

      // Group posts into chunks
      const chunks = this.groupPostsIntoChunks(postItems, config.chunkType);

      this.logger.info(
        `ContentChunkerService.chunk: Generated chunks [count=${chunks.length}]`,
      );

      // Process each chunk
      for (const chunk of chunks) {
        try {
          const result = await this.processChunk(
            config.projectId,
            config.personId,
            chunk,
          );

          if (result.success) {
            totalChunksCreated++;
            totalItemsLinked += result.itemsLinked;
          }
        } catch (chunkError) {
          this.logger.error(
            `ContentChunkerService.chunk: Failed to process chunk [chunkKey=${chunk.key}, error=${chunkError.message}]`,
          );
          // Continue processing other chunks
        }
      }

      this.logger.info(
        `ContentChunkerService.chunk completed [chunksCreated=${totalChunksCreated}, itemsLinked=${totalItemsLinked}]`,
      );

      return {
        chunksCreated: totalChunksCreated,
        itemsLinked: totalItemsLinked,
      };
    } catch (error) {
      this.logger.error(
        `ContentChunkerService.chunk error [error=${error.message}, stack=${error.stack}]`,
      );
      throw error;
    }
  }

  private groupPostsIntoChunks(
    postItems: any[],
    chunkType: CHUNK_TYPE,
  ): ChunkGroup[] {
    const groups = new Map<string, ChunkGroup>();

    for (const post of postItems) {
      let key: string;
      let fromAt: Date | null = null;
      let toAt: Date | null = null;

      if (!post.PostedAt) {
        // Undated posts go into one batch chunk
        key = 'undated';
      } else {
        const postedDate = new Date(post.PostedAt);

        if (chunkType === CHUNK_TYPE.MONTHLY) {
          // Group by month (YYYY-MM) in UTC
          const year = getUtcYear(postedDate);
          const month = getUtcMonth(postedDate); // 0-11
          key = `${year}-${String(month + 1).padStart(2, '0')}`;

          // Set chunk boundaries in UTC
          fromAt = getUtcMonthStart(year, month);
          toAt = getUtcMonthEnd(year, month);
        } else {
          // BATCH: all dated posts in one chunk
          key = 'dated-batch';
        }
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          fromAt,
          toAt,
          postItemIds: [],
        });
      }

      groups.get(key)!.postItemIds.push(post.PostItemID);
    }

    return Array.from(groups.values());
  }

  private async processChunk(
    projectId: number,
    personId: number,
    chunk: ChunkGroup,
  ): Promise<{ success: boolean; itemsLinked: number }> {
    try {
      // Compute fingerprint for chunk
      const fingerprintInput = `${projectId}|${personId}|${chunk.key}`;
      const fingerprint = createHash('sha256')
        .update(fingerprintInput)
        .digest('hex')
        .substring(0, 64);

      // Determine chunk type and source
      const chunkType =
        chunk.key === 'undated' || chunk.key === 'dated-batch'
          ? CHUNK_TYPE.BATCH
          : CHUNK_TYPE.MONTHLY;
      const source = DATA_SOURCE.LINKEDIN;

      // Check if chunk already exists
      const existingChunks = await Promisify<ContentChunk[]>(
        this.contentChunkRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              Fingerprint: fingerprint,
            },
          },
          false,
        ),
      );

      let contentChunkId: number;

      if (existingChunks && existingChunks.length > 0) {
        contentChunkId = existingChunks[0].ContentChunkID;
        this.logger.info(
          `ContentChunkerService.processChunk: Chunk already exists [chunkId=${contentChunkId}, fingerprint=${fingerprint}]`,
        );
      } else {
        // Create new ContentChunk
        const newChunk = await Promisify<ContentChunk>(
          this.contentChunkRepoService.create({
            ProjectID: projectId,
            PersonID: personId,
            Source: source,
            ChunkType: chunkType,
            FromAt: chunk.fromAt,
            ToAt: chunk.toAt,
            PostCount: 0,
            Fingerprint: fingerprint,
            Status: CHUNK_STATUS.CREATED,
            IsValid: true,
          }),
        );

        contentChunkId = newChunk.ContentChunkID;
        this.logger.info(
          `ContentChunkerService.processChunk: Created chunk [chunkId=${contentChunkId}, chunkKey=${chunk.key}]`,
        );
      }

      // Link posts to chunk via ContentChunkItem
      let linkedCount = 0;
      for (const postItemId of chunk.postItemIds) {
        try {
          await Promisify<ContentChunkItem>(
            this.contentChunkItemRepoService.create({
              ContentChunkID: contentChunkId,
              PostItemID: postItemId,
            }),
          );

          linkedCount++;
          // Ignore duplicate errors (unique constraint)
        } catch (linkError) {
          // Continue on error (likely duplicate)
        }
      }

      // Update chunk PostCount and Status
      await Promisify<ContentChunk>(
        this.contentChunkRepoService.update(
          { ContentChunkID: contentChunkId },
          {
            PostCount: chunk.postItemIds.length,
            Status: CHUNK_STATUS.POPULATED,
          },
        ),
      );

      this.logger.info(
        `ContentChunkerService.processChunk: Linked posts [chunkId=${contentChunkId}, linkedCount=${linkedCount}]`,
      );

      return { success: true, itemsLinked: linkedCount };
    } catch (error) {
      this.logger.error(
        `ContentChunkerService.processChunk error [chunkKey=${chunk.key}, error=${error.message}]`,
      );
      return { success: false, itemsLinked: 0 };
    }
  }
}

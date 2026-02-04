import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { Document } from '../../../repo/entities/document.entity';
import { PostItem } from '../../../repo/entities/post-item.entity';
import { DocumentRepoService } from '../../../repo/document-repo.service';
import { PostItemRepoService } from '../../../repo/post-item-repo.service';
import { DocumentsService } from '../../../documents/documents.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { sha256Hex } from '../../../common/helpers/sha256';
import { ResultWithError } from '../../../common/interfaces';
import {
  DocumentSource,
  DocumentKind,
} from '../../../common/types/document.types';
import { DATA_SOURCE } from '../../../common/types/posts.types';
import {
  NormalizeLinkedinPostsInputConfig,
  NormalizeLinkedinPostsResult,
} from '../../../common/interfaces/module-inputs.interface';

@Injectable()
export class LinkedinPostsNormalizerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentRepoService: DocumentRepoService,
    private postItemRepoService: PostItemRepoService,
    private documentsService: DocumentsService,
  ) {}

  async normalize(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinPostsNormalizerService.normalize: Starting [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const inputConfig = (run.InputConfigJson ||
        {}) as NormalizeLinkedinPostsInputConfig;
      const maxPosts = inputConfig.maxPosts || 500;
      const forceRebuild = inputConfig.forceRebuild || false;

      // Step A: Fetch document
      let document: Document;

      if (inputConfig.documentId) {
        document = await Promisify<Document>(
          this.documentRepoService.get(
            { where: { DocumentID: inputConfig.documentId } },
            true,
          ),
        );
      } else {
        document = await Promisify<Document>(
          this.documentsService.getLatestValidDocument({
            projectId: run.ProjectID,
            personId: run.PersonID,
            source: DocumentSource.LINKEDIN,
            documentKind: DocumentKind.LINKEDIN_POSTS,
          }),
        );
      }

      this.logger.info(
        `LinkedinPostsNormalizerService.normalize: Using document [documentId=${document.DocumentID}, capturedAt=${document.CapturedAt}]`,
      );

      // Step E: Handle forceRebuild - mark existing posts as invalid
      if (forceRebuild) {
        const existingPosts = await Promisify<PostItem[]>(
          this.postItemRepoService.getAll(
            {
              where: {
                SourceDocumentID: document.DocumentID,
                IsValid: true,
              },
            },
            false,
          ),
        );

        if (existingPosts.length > 0) {
          this.logger.info(
            `LinkedinPostsNormalizerService.normalize: ForceRebuild enabled, marking ${existingPosts.length} existing posts as invalid`,
          );

          for (const post of existingPosts) {
            await Promisify<PostItem>(
              this.postItemRepoService.update(
                { PostItemID: post.PostItemID },
                { IsValid: false },
              ),
            );
          }
        }
      }

      // Step B: Parse document JSON
      const rawJson = document.PayloadJson;
      let postsArray: any[] = [];

      if (Array.isArray(rawJson)) {
        postsArray = rawJson;
      } else if (rawJson?.recentPosts && Array.isArray(rawJson.recentPosts)) {
        postsArray = rawJson.recentPosts;
      } else if (
        rawJson?.data?.recentPosts &&
        Array.isArray(rawJson.data.recentPosts)
      ) {
        postsArray = rawJson.data.recentPosts;
      } else if (rawJson?.results && Array.isArray(rawJson.results)) {
        postsArray = rawJson.results.flatMap(
          (result: any) => result?.data?.recentPosts || [],
        );
      } else if (rawJson?.items && Array.isArray(rawJson.items)) {
        postsArray = rawJson.items;
      } else if (rawJson?.posts && Array.isArray(rawJson.posts)) {
        postsArray = rawJson.posts;
      } else if (rawJson?.data && Array.isArray(rawJson.data)) {
        postsArray = rawJson.data;
      } else {
        return {
          error: new Error(
            'Document JSON does not contain a valid posts array (expected: items, posts, data, or array directly)',
          ),
          data: null,
        };
      }

      this.logger.info(
        `LinkedinPostsNormalizerService.normalize: Found ${postsArray.length} posts in document, processing up to ${maxPosts}`,
      );

      // Log sample post structure for debugging
      if (postsArray.length > 0) {
        const sampleKeys = Object.keys(postsArray[0] || {}).join(', ');
        this.logger.debug(
          `LinkedinPostsNormalizerService.normalize: Parsed LinkedIn post payload successfully [samplePostKeys=${sampleKeys}]`,
        );
      }

      // Step C & D: Process posts with deduplication
      let created = 0;
      let skipped = 0;
      const postsToProcess = postsArray.slice(0, maxPosts);

      for (const rawPost of postsToProcess) {
        try {
          const postItem = this.extractPostItem(
            rawPost,
            run.ProjectID,
            run.PersonID,
            document.DocumentID,
          );

          // Dedupe check
          const existing = await Promisify<PostItem[]>(
            this.postItemRepoService.getAll(
              {
                where: {
                  ProjectID: run.ProjectID,
                  PersonID: run.PersonID,
                  Fingerprint: postItem.Fingerprint,
                },
                take: 1,
                order: { CreatedAt: 'DESC' },
              },
              false,
            ),
          );

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // Create new post item
          await Promisify<PostItem>(this.postItemRepoService.create(postItem));
          created++;
        } catch (error) {
          this.logger.warn(
            `LinkedinPostsNormalizerService.normalize: Failed to process individual post [error=${error.message}]`,
          );
          skipped++;
        }
      }

      const totalParsed = postsToProcess.length;

      this.logger.info(
        `LinkedinPostsNormalizerService.normalize: Completed [created=${created}, skipped=${skipped}, totalParsed=${totalParsed}]`,
      );

      const result: NormalizeLinkedinPostsResult = {
        created,
        skipped,
        totalParsed,
        documentId: document.DocumentID,
      };

      return { error: null, data: result };
    } catch (error) {
      this.logger.error(
        `LinkedinPostsNormalizerService.normalize: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }

  private extractPostItem(
    rawPost: any,
    projectId: number,
    personId: number,
    sourceDocumentId: number,
  ): Partial<PostItem> {
    // Extract PlatformPostID - priority order
    const platformPostId =
      rawPost.activityUrn ||
      rawPost.urn?.ugcPost_urn ||
      rawPost.full_urn ||
      rawPost.urn?.activity_urn ||
      null;

    // Extract Permalink - canonical LinkedIn activity URL
    const permalink = rawPost.postUrl || rawPost.url || null;

    // Parse PostedAt from Apify structure
    let postedAt: Date | null = null;
    if (rawPost.posted_at?.timestamp) {
      try {
        // timestamp is in milliseconds
        postedAt = new Date(rawPost.posted_at.timestamp);
        if (isNaN(postedAt.getTime())) {
          postedAt = null;
        }
      } catch {
        postedAt = null;
      }
    } else if (rawPost.posted_at?.date) {
      try {
        postedAt = new Date(rawPost.posted_at.date);
        if (isNaN(postedAt.getTime())) {
          postedAt = null;
        }
      } catch {
        postedAt = null;
      }
    }

    if (!postedAt && rawPost.createdAt) {
      try {
        postedAt = new Date(rawPost.createdAt);
        if (isNaN(postedAt.getTime())) {
          postedAt = null;
        }
      } catch {
        postedAt = null;
      }
    }

    // Extract text content
    const text =
      rawPost.text ||
      rawPost.caption ||
      rawPost.content ||
      rawPost.shareText ||
      rawPost.commentary ||
      null;

    // Parse MediaUrlsJson from media structure
    let mediaUrls: string[] = [];
    if (rawPost.media) {
      if (Array.isArray(rawPost.media.images)) {
        mediaUrls = rawPost.media.images
          .map((img: any) => img?.url)
          .filter((url: any) => typeof url === 'string' && url.length > 0);
      } else if (rawPost.media.url) {
        mediaUrls = [rawPost.media.url];
      }
    }

    // Parse EngagementJson from stats structure
    let engagement: any = null;
    if (rawPost.stats) {
      engagement = {
        likeCount: rawPost.stats.like ?? 0,
        loveCount: rawPost.stats.love ?? 0,
        funnyCount: rawPost.stats.funny ?? 0,
        insightCount: rawPost.stats.insight ?? 0,
        supportCount: rawPost.stats.support ?? 0,
        celebrateCount: rawPost.stats.celebrate ?? 0,
        commentCount: rawPost.stats.comments ?? 0,
        repostCount: rawPost.stats.reposts ?? 0,
        totalReactions: rawPost.stats.total_reactions ?? null,
      };

      // Add author info if available
      if (rawPost.firstName || rawPost.lastName || rawPost.username) {
        engagement.authorSummary = {
          firstName: rawPost.firstName || null,
          lastName: rawPost.lastName || null,
          username: rawPost.username || null,
          headline: rawPost.headline || null,
          profileUrl: rawPost.profileUrl || null,
        };
      }

      // Add post metadata
      if (rawPost.post_type) {
        engagement.postType = rawPost.post_type;
      }
      if (rawPost.posted_at?.relative) {
        engagement.postedAtRelative = rawPost.posted_at.relative;
      }
    } else if (
      rawPost.numLikes !== undefined ||
      rawPost.numComments !== undefined ||
      rawPost.numShares !== undefined ||
      rawPost.reactionTypeCounts !== undefined
    ) {
      engagement = {
        likeCount: rawPost.numLikes ?? 0,
        commentCount: rawPost.numComments ?? 0,
        repostCount: rawPost.numShares ?? 0,
        reactionTypeCounts: rawPost.reactionTypeCounts || [],
      };
    }

    // Compute fingerprint - stable identifier
    const postedAtIso = postedAt ? postedAt.toISOString() : '';
    const textSnippet = (text || '').slice(0, 160);
    const fingerprintInput = `${platformPostId || ''}|${
      permalink || ''
    }|${postedAtIso}|${textSnippet}`;
    const fingerprint = sha256Hex(fingerprintInput).substring(0, 255);

    return {
      ProjectID: projectId,
      PersonID: personId,
      SourceDocumentID: sourceDocumentId,
      Source: DATA_SOURCE.LINKEDIN,
      PlatformPostID: platformPostId,
      Permalink: permalink,
      PostedAt: postedAt,
      Text: text,
      MediaUrlsJson: mediaUrls.length > 0 ? mediaUrls : null,
      EngagementJson: engagement,
      Fingerprint: fingerprint,
      IsValid: true,
    };
  }
}

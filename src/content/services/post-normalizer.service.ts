import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PostItemRepoService } from '../../repo/post-item-repo.service';
import { PostItem } from '../../repo/entities/post-item.entity';
import { DATA_SOURCE } from '../../common/types/posts.types';
import {
  NormalizedPostInput,
  NormalizedPostResult,
} from '../../common/interfaces/post-normalizer.interface';
import { Promisify } from '../../common/helpers/promisifier';
import { createHash } from 'crypto';

@Injectable()
export class PostNormalizerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private postItemRepoService: PostItemRepoService,
  ) {}

  async normalizeLinkedInPostsDocument(
    input: NormalizedPostInput,
  ): Promise<NormalizedPostResult> {
    const {
      projectId,
      personId,
      sourceDocumentId,
      documentJson,
      source = DATA_SOURCE.LINKEDIN,
    } = input;

    this.logger.info(
      `PostNormalizerService.normalizeLinkedInPostsDocument started [projectId=${projectId}, personId=${personId}, documentId=${sourceDocumentId}]`,
    );

    let created = 0;
    let skipped = 0;

    // Extract posts array from common JSON shapes
    const postsArray =
      documentJson?.items || documentJson?.posts || documentJson?.data || [];

    if (!Array.isArray(postsArray)) {
      this.logger.warn(
        `PostNormalizerService.normalizeLinkedInPostsDocument: No valid posts array found [projectId=${projectId}, personId=${personId}, documentId=${sourceDocumentId}]`,
      );
      return { created: 0, skipped: 0 };
    }

    for (const post of postsArray) {
      try {
        // Extract fields from post
        const platformPostId = post.postId || post.id || post.urn || null;
        const permalink = post.permalink || post.url || post.link || null;
        const postedAt =
          post.postedAt || post.createdAt || post.timestamp || null;
        const text = post.text || post.content || post.commentary || null;
        const engagementJson = this.extractEngagement(post);
        const mediaUrlsJson = this.extractMedia(post);

        // Compute fingerprint
        const textSnippet = text ? String(text).substring(0, 120) : '';
        const fingerprintInput = `${
          platformPostId || permalink || postedAt || ''
        }|${textSnippet}`;
        const fingerprint = this.computeFingerprint(fingerprintInput);

        // Check if post already exists
        const existingPosts = await Promisify<PostItem[]>(
          this.postItemRepoService.getAll(
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

        if (existingPosts && existingPosts.length > 0) {
          skipped++;
          continue;
        }

        // Parse posted date if present
        let parsedPostedAt: Date | null = null;
        if (postedAt) {
          try {
            parsedPostedAt = new Date(postedAt);
            if (isNaN(parsedPostedAt.getTime())) {
              parsedPostedAt = null;
            }
          } catch {
            parsedPostedAt = null;
          }
        }

        // Create new PostItem
        await Promisify<PostItem>(
          this.postItemRepoService.create({
            ProjectID: projectId,
            PersonID: personId,
            SourceDocumentID: sourceDocumentId,
            Source: source,
            PlatformPostID: platformPostId,
            Permalink: permalink,
            PostedAt: parsedPostedAt,
            Text: text,
            MediaUrlsJson: mediaUrlsJson,
            EngagementJson: engagementJson,
            Fingerprint: fingerprint,
            IsValid: true,
          }),
        );

        created++;
      } catch (error) {
        this.logger.error(
          `PostNormalizerService.normalizeLinkedInPostsDocument: Error processing post [projectId=${projectId}, personId=${personId}, error=${error.message}]`,
        );
      }
    }

    this.logger.info(
      `PostNormalizerService.normalizeLinkedInPostsDocument completed [created=${created}, skipped=${skipped}]`,
    );

    return { created, skipped };
  }

  private extractEngagement(post: any): any {
    const engagement: any = {};

    if (post.likes !== undefined) engagement.likes = post.likes;
    if (post.comments !== undefined) engagement.comments = post.comments;
    if (post.shares !== undefined) engagement.shares = post.shares;
    if (post.reactions !== undefined) engagement.reactions = post.reactions;
    if (post.numLikes !== undefined) engagement.numLikes = post.numLikes;
    if (post.numComments !== undefined)
      engagement.numComments = post.numComments;
    if (post.numShares !== undefined) engagement.numShares = post.numShares;

    // If nested engagement object exists
    if (post.engagement) {
      Object.assign(engagement, post.engagement);
    }

    return Object.keys(engagement).length > 0 ? engagement : null;
  }

  private extractMedia(post: any): any {
    const media: string[] = [];

    // Check for common media field patterns
    if (post.images && Array.isArray(post.images)) {
      media.push(...post.images);
    }
    if (post.videos && Array.isArray(post.videos)) {
      media.push(...post.videos);
    }
    if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
      media.push(...post.mediaUrls);
    }
    if (post.media && Array.isArray(post.media)) {
      media.push(...post.media);
    }

    // Check for single media fields
    if (post.image && typeof post.image === 'string') {
      media.push(post.image);
    }
    if (post.video && typeof post.video === 'string') {
      media.push(post.video);
    }

    return media.length > 0 ? media : null;
  }

  private computeFingerprint(input: string): string {
    return createHash('sha256').update(input).digest('hex').substring(0, 64);
  }
}

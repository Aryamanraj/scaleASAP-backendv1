/**
 * Low Quality Engagement Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface LowQualityEngagementEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a behavior analyst. Identify low-quality engagement patterns.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildLowQualityEngagementPrompt(
  evidence: LowQualityEngagementEvidence,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile =
    evidence.profile || ({} as LowQualityEngagementEvidence['profile']);
  const posts = evidence.recentPosts || [];

  const userPrompt = `Identify low-quality engagement patterns (one-word comments, freebies, link drops).

Profile:
- URL: ${profile.profileUrl || 'unknown'}
- URN: ${profile.profileUrn || 'unknown'}
- Name: ${profile.fullName || 'unknown'}
- Headline: ${profile.headline || 'none'}

Recent Posts (limited):
${
  posts.length > 0
    ? posts
        .slice(0, 40)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 240)}`,
        )
        .join('\n')
    : 'No posts provided'
}

Return JSON with this exact schema:
{
  "lowQualityEngagement": [
    { "type": "ONE_WORD_COMMENT|FREEBIE_SEEKING|LINK_DROP", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

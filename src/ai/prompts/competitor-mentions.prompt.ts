/**
 * Competitor Mentions Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface CompetitorMentionsEvidence {
  profile: Pick<
    ProfileData,
    | 'profileUrl'
    | 'profileUrn'
    | 'fullName'
    | 'headline'
    | 'about'
    | 'experience'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
  recentReposts?: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a competitive intelligence analyst. Extract competitor mentions from the content.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildCompetitorMentionsPrompt(
  evidence: CompetitorMentionsEvidence,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile =
    evidence.profile || ({} as CompetitorMentionsEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];

  const userPrompt = `Extract competitor mentions from the profile and posts.

Profile:
- URL: ${profile.profileUrl || 'unknown'}
- URN: ${profile.profileUrn || 'unknown'}
- Name: ${profile.fullName || 'unknown'}
- Headline: ${profile.headline || 'none'}
- About: ${profile.about || 'none'}

Recent Posts (limited):
${
  posts.length > 0
    ? posts
        .slice(0, 30)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 240)}`,
        )
        .join('\n')
    : 'No posts provided'
}

Recent Reposts (limited, treat as secondary signals and label as repost evidence):
${
  reposts.length > 0
    ? reposts
        .slice(0, 30)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 240)}`,
        )
        .join('\n')
    : 'No reposts provided'
}

Return JSON with this exact schema:
{
  "competitorMentions": [
    { "name": "...", "type": "DIRECT|INDIRECT|COMPARISON|REPLACEMENT", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

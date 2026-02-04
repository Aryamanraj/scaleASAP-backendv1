/**
 * LinkedIn Activity Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface LinkedinActivityEvidence {
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
}

const SYSTEM_PROMPT = `You are a social activity analyst. Assess how active this person is on LinkedIn.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildLinkedinActivityPrompt(
  evidence: LinkedinActivityEvidence,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile =
    evidence.profile || ({} as LinkedinActivityEvidence['profile']);
  const posts = evidence.recentPosts || [];

  const userPrompt = `Assess how active this person is on LinkedIn.

Profile:
- URL: ${profile.profileUrl || 'unknown'}
- URN: ${profile.profileUrn || 'unknown'}
- Name: ${profile.fullName || 'unknown'}
- Headline: ${profile.headline || 'none'}
- About: ${profile.about || 'none'}
- Experience Count: ${profile.experience?.length || 0}

Recent Posts (limited):
${
  posts.length > 0
    ? posts
        .slice(0, 30)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 200)}`,
        )
        .join('\n')
    : 'No posts provided'
}

Return JSON with this exact schema:
{
  "linkedinActivity": {
    "level": "HIGH|MEDIUM|LOW|INACTIVE",
    "confidence": 0-1,
    "signals": [
      { "type": "POST_FREQUENCY|COMMENT_FREQUENCY|RECENT_POST", "evidence": "...", "weight": 0-1 }
    ],
    "summary": "..."
  }
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

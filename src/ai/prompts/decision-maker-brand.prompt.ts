/**
 * Decision Maker + Brand Positioning Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface DecisionMakerBrandEvidence {
  profile: Pick<
    ProfileData,
    | 'profileUrl'
    | 'profileUrn'
    | 'fullName'
    | 'headline'
    | 'about'
    | 'experience'
    | 'education'
    | 'projects'
    | 'publications'
    | 'honors'
    | 'volunteer'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
  recentReposts?: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a rigorous B2B analyst. Determine if the person is a decision maker who cares about brand/positioning.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildDecisionMakerBrandPrompt(
  evidence: DecisionMakerBrandEvidence,
): { systemPrompt: string; userPrompt: string } {
  const profile =
    evidence.profile || ({} as DecisionMakerBrandEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];

  const userPrompt = `Analyze this LinkedIn profile and posts for decision-maker + brand/positioning signals.

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
        .slice(0, 20)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 280)}`,
        )
        .join('\n')
    : 'No posts provided'
}

Recent Reposts (limited, use as secondary signals only):
${
  reposts.length > 0
    ? reposts
        .slice(0, 20)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 280)}`,
        )
        .join('\n')
    : 'No reposts provided'
}

Return JSON with this exact schema:
{
  "decisionMakerBrand": {
    "level": "HIGH|MEDIUM|LOW|UNKNOWN",
    "confidence": 0-1,
    "signals": [
      { "type": "ROLE_TITLE|POST_CONTENT|ABOUT_SECTION|COMPANY_PAGE", "evidence": "...", "weight": 0-1 }
    ],
    "summary": "..."
  }
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

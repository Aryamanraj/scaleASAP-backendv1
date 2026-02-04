/**
 * Design Help Signals Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface DesignHelpSignalsEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline' | 'about'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a services demand analyst. Detect design help signals.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildDesignHelpSignalsPrompt(
  evidence: DesignHelpSignalsEvidence,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile =
    evidence.profile || ({} as DesignHelpSignalsEvidence['profile']);
  const posts = evidence.recentPosts || [];

  const userPrompt = `Detect mentions of design help, hiring designers, or agency searches.

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
  "designHelpSignals": [
    { "type": "HIRING_DESIGNER|SEEKING_FEEDBACK|AGENCY_SEARCH", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

/**
 * Hiring Signals Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface HiringSignalsEvidence {
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

const SYSTEM_PROMPT = `You are a hiring signals analyst. Identify hiring signals, team welcomes, and referral requests.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildHiringSignalsPrompt(evidence: HiringSignalsEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile = evidence.profile || ({} as HiringSignalsEvidence['profile']);
  const posts = evidence.recentPosts || [];

  const userPrompt = `Identify hiring-related signals from the profile and posts.

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

Return JSON with this exact schema:
{
  "hiringSignals": [
    { "type": "ROLE_OPENING|TEAM_WELCOME|REFERRAL_REQUEST", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

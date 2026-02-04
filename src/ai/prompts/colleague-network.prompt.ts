/**
 * Colleague Network Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
  ExperienceItem,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface ColleagueNetworkEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline' | 'about'
  > & {
    experience?: ExperienceItem[];
  };
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a relationship graph analyst. Extract colleague mentions and classify the relationship type.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildColleagueNetworkPrompt(
  evidence: ColleagueNetworkEvidence,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile =
    evidence.profile || ({} as ColleagueNetworkEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const experience = profile.experience || [];

  const userPrompt = `Extract colleagues mentioned in posts or profile experience and classify relationship type.

Profile:
- URL: ${profile.profileUrl || 'unknown'}
- URN: ${profile.profileUrn || 'unknown'}
- Name: ${profile.fullName || 'unknown'}
- Headline: ${profile.headline || 'none'}
- About: ${profile.about || 'none'}

Experience (limited):
${
  experience.length > 0
    ? experience
        .slice(0, 10)
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.title || 'unknown'} at ${
              item.company || 'unknown'
            } (${item.startDate || 'unknown'} - ${item.endDate || 'present'})`,
        )
        .join('\n')
    : 'No experience provided'
}

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
  "colleagueNetwork": [
    { "name": "...", "type": "TEAMMATE|MANAGER|REPORT|PARTNER", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

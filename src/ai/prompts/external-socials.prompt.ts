/**
 * External Socials Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface ExternalSocialsEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline' | 'about'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
  recentReposts?: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a digital footprint analyst. Extract external socials, websites, and emails.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildExternalSocialsPrompt(evidence: ExternalSocialsEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile =
    evidence.profile || ({} as ExternalSocialsEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];

  const userPrompt = `Extract external socials (Twitter, Instagram, GitHub), websites, and emails from the content.

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

Recent Reposts (limited, include for socials/links but lower confidence):
${
  reposts.length > 0
    ? reposts
        .slice(0, 40)
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
  "externalSocials": [
    { "type": "TWITTER|INSTAGRAM|GITHUB|EMAIL|WEBSITE|OTHER", "value": "...", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

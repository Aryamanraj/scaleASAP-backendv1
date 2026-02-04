/**
 * Tone Signals Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface ToneSignalsEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline' | 'about'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
  recentReposts?: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a language tone analyst. Classify tone of posts and map to growth signals.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildToneSignalsPrompt(evidence: ToneSignalsEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile = evidence.profile || ({} as ToneSignalsEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];

  const userPrompt = `Classify tone of posts and map to growth signals.

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

Recent Reposts (limited, treat tone as secondary and do NOT fully attribute to author):
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
  "toneSignals": [
    { "tone": "ANXIOUS|EXCITED|RAGE_BAIT|NEUTRAL|OPTIMISTIC|PESSIMISTIC", "growthSignal": "POSITIVE|NEGATIVE|NEUTRAL", "evidence": "...", "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

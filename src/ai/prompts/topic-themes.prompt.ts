/**
 * Topic Themes Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface TopicThemesEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline' | 'about'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
}

const SYSTEM_PROMPT = `You are a topic modeling analyst. Cluster posts into themes and label each theme.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildTopicThemesPrompt(evidence: TopicThemesEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile = evidence.profile || ({} as TopicThemesEvidence['profile']);
  const posts = evidence.recentPosts || [];

  const userPrompt = `Cluster posts into themes and label each theme.

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
  "topicThemes": [
    { "category": "BRANDING|POSITIONING|PRODUCT|MARKETING|TEAM|FUNDING|OTHER", "label": "...", "evidence": ["..."], "confidence": 0-1 }
  ]
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

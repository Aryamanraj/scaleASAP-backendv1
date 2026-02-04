/**
 * Final Summary Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface FinalSummaryEvidence {
  profile: Pick<
    ProfileData,
    'profileUrl' | 'profileUrn' | 'fullName' | 'headline' | 'about'
  >;
  recentPosts: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
  recentReposts?: Array<Pick<RecentPost, 'postUrl' | 'text' | 'createdAt'>>;
  claims: Array<{ claimType: string; value: any }>;
}

const SYSTEM_PROMPT = `You are an analyst generating a structured final summary from evidence and claims.
Return ONLY valid JSON with no extra text or code fences.`;

export function buildFinalSummaryPrompt(evidence: FinalSummaryEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile = evidence.profile || ({} as FinalSummaryEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];
  const claims = evidence.claims || [];

  const userPrompt = `Generate a structured final summary for a design-agency style lead profile.
Use the provided claims as primary signals and fill gaps from profile/posts when possible.

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

Recent Reposts (limited, treat as secondary signals only):
${
  reposts.length > 0
    ? reposts
        .slice(0, 20)
        .map(
          (post, idx) =>
            `${idx + 1}. ${post.createdAt || 'unknown'} | ${
              post.postUrl || 'no-url'
            } | ${(post.text || '').substring(0, 240)}`,
        )
        .join('\n')
    : 'No reposts provided'
}

Claims (latest):
${
  claims.length > 0
    ? claims
        .map(
          (claim, idx) =>
            `${idx + 1}. ${claim.claimType} | ${JSON.stringify(
              claim.value,
            ).substring(0, 800)}`,
        )
        .join('\n')
    : 'No claims provided'
}

Return JSON with this exact schema:
{
  "finalSummary": {
    "decisionMakerBrand": "...",
    "revenueSignal": "...",
    "linkedinActivity": "...",
    "competitorMentions": "...",
    "hiringSignals": "...",
    "topicThemes": "...",
    "toneSignals": "...",
    "colleagueNetwork": "...",
    "externalSocials": "...",
    "eventAttendance": "...",
    "lowQualityEngagement": "...",
    "designHelpSignals": "...",
    "overallSummary": "...",
    "confidence": 0-1
  }
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

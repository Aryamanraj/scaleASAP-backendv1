/**
 * Revenue Signal Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface RevenueSignalEvidence {
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
  companyInfo?: {
    name?: string;
    domain?: string;
    linkedinUrl?: string;
  };
}

const SYSTEM_PROMPT = `You are a rigorous growth analyst. Infer whether the company is funded or bootstrapped yet high revenue (>= $100k/month).
Return ONLY valid JSON with no extra text or code fences.`;

export function buildRevenueSignalPrompt(evidence: RevenueSignalEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile = evidence.profile || ({} as RevenueSignalEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];
  const company = evidence.companyInfo || {};

  const userPrompt = `Analyze the LinkedIn profile and posts for revenue signals.

Company Info:
- Name: ${company.name || 'unknown'}
- Domain: ${company.domain || 'unknown'}
- LinkedIn: ${company.linkedinUrl || 'unknown'}

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

Recent Reposts (ignore for revenue inference unless explicitly about their own company):
${
  reposts.length > 0
    ? reposts
        .slice(0, 10)
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
  "revenueSignal": {
    "level": "HIGH|MEDIUM|LOW|UNKNOWN",
    "confidence": 0-1,
    "signals": [
      { "type": "FUNDING|TEAM_SIZE|SALES_METRICS|CUSTOMER_LOGOS", "evidence": "...", "weight": 0-1 }
    ],
    "summary": "..."
  }
}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

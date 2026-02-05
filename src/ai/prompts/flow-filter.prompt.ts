/**
 * Flow Filter Prompt Builder
 */

import {
  ProfileData,
  RecentPost,
} from '../../common/interfaces/linkedin-scraper.interfaces';

export interface FlowFilterEvidence {
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
  filterInstructions: string;
}

const SYSTEM_PROMPT = `You are a strict profile filter evaluator.
You must follow the filter instructions exactly.
Return ONLY valid JSON with no extra text or code fences.`;

function summarizeExperience(experience: Array<any> | undefined): {
  totalMonths: number;
  itemsCounted: number;
} {
  if (!experience || experience.length === 0) {
    return { totalMonths: 0, itemsCounted: 0 };
  }

  const parseDurationText = (text: string | undefined | null): number => {
    if (!text) {
      return 0;
    }
    const yearsMatch = text.match(/(\d+)\s*(yr|yrs|year|years)/i);
    const monthsMatch = text.match(/(\d+)\s*(mo|mos|month|months)/i);
    const years = yearsMatch ? Number(yearsMatch[1]) : 0;
    const months = monthsMatch ? Number(monthsMatch[1]) : 0;
    return years * 12 + months;
  };

  let totalMonths = 0;
  let itemsCounted = 0;

  for (const exp of experience) {
    const durationMonths = parseDurationText(exp?.duration);
    let months = durationMonths;

    if (!months) {
      months = parseDurationText(exp?.company);
    }

    if (months > 0) {
      totalMonths += months;
      itemsCounted += 1;
    }
  }

  return { totalMonths, itemsCounted };
}

export function buildFlowFilterPrompt(evidence: FlowFilterEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const profile = evidence.profile || ({} as FlowFilterEvidence['profile']);
  const posts = evidence.recentPosts || [];
  const reposts = evidence.recentReposts || [];
  const experienceSummary = summarizeExperience(profile.experience as any);
  const totalYearsApprox = Math.floor(experienceSummary.totalMonths / 12);
  const remainingMonths = experienceSummary.totalMonths % 12;

  const userPrompt = `Evaluate whether this profile should proceed to enrichment/composer stages.

Filter Instructions:
${evidence.filterInstructions}

Profile:
- URL: ${profile.profileUrl || 'unknown'}
- URN: ${profile.profileUrn || 'unknown'}
- Name: ${profile.fullName || 'unknown'}
- Headline: ${profile.headline || 'none'}
- About: ${profile.about || 'none'}
- Experience Count: ${
    profile.experience?.length || 0
  } (count of entries, not total years)
- Estimated Total Experience (sum of explicit durations only): ${totalYearsApprox} yrs ${remainingMonths} mos (based on ${
    experienceSummary.itemsCounted
  } entries with explicit durations)

Experience Entries (limited):
${
  profile.experience && profile.experience.length > 0
    ? profile.experience
        .slice(0, 12)
        .map(
          (exp, idx) =>
            `${idx + 1}. ${exp.title || 'unknown'} | ${
              exp.company || 'unknown'
            } | ${exp.duration || 'unknown'} | ${exp.location || 'unknown'}`,
        )
        .join('\n')
    : 'No experience entries provided'
}

Recent Posts (limited):
${
  posts.length > 0
    ? posts
        .slice(0, 20)
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
  "shouldProceed": true | false,
  "reason": "...",
  "confidence": 0-1,
  "unsupportedFilters": ["..."]
}

Rules:
- If unsupportedFilters is non-empty and no other valid filters apply, set shouldProceed=true with reason explaining the unsupported request.
- Be conservative: if evidence is missing, default to shouldProceed=true unless the instructions explicitly require proof.
`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

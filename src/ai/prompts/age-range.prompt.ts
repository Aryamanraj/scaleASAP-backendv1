/**
 * Age Range Estimation Prompt Builder
 */

interface AgeRangeEvidence {
  education: Array<{
    school: string;
    degree: string;
    field: string;
    endYear: number | null;
  }>;
  career: Array<{
    title: string;
    company: string;
    startYear: number | null;
    isCurrent: boolean;
  }>;
  profileMeta: {
    linkedinProfileCapturedYear: number | null;
  };
  currentYear: number;
}

const SYSTEM_PROMPT = `You are estimating a conservative AGE RANGE for a real person using only the provided evidence.
Never guess an exact age. Output JSON only.

Rules:
1. When dates are available: use education end years and career start years
2. When dates are missing: infer conservatively from:
   - Degree type (Bachelor's ~22, Master's ~24, PhD ~27)
   - Role seniority (entry-level vs senior vs C-suite)
   - Number of roles and career progression
   - LinkedIn profile age (minimum profile age if available)
3. If truly insufficient evidence, return nulls with LOW confidence
4. Maximum age range width: 12 years
5. Return confidence: LOW (weak evidence), MED (moderate evidence), HIGH (strong evidence)
6. Include brief notes explaining your reasoning
7. Include evidence array listing key facts used

Output ONLY valid JSON in this exact schema:
{
  "minAge": number | null,
  "maxAge": number | null,
  "confidence": "LOW" | "MED" | "HIGH",
  "evidence": string[],
  "notes": string
}`;

export function buildAgeRangePrompt(evidenceJson: AgeRangeEvidence): {
  systemPrompt: string;
  userPrompt: string;
} {
  const userPrompt = `Estimate the age range for this person:

Current Year: ${evidenceJson.currentYear}${
    evidenceJson.profileMeta.linkedinProfileCapturedYear
      ? `\nLinkedIn Profile Captured: ${evidenceJson.profileMeta.linkedinProfileCapturedYear}`
      : ''
  }

Education History:
${
  evidenceJson.education.length > 0
    ? evidenceJson.education
        .map(
          (edu, idx) =>
            `${idx + 1}. ${edu.school}${edu.degree ? ` - ${edu.degree}` : ''}${
              edu.field ? ` in ${edu.field}` : ''
            }${
              edu.endYear
                ? ` (graduated ~${edu.endYear})`
                : ' (graduation year unknown)'
            }`,
        )
        .join('\n')
    : 'No education history provided'
}

Career History:
${
  evidenceJson.career.length > 0
    ? evidenceJson.career
        .map(
          (role, idx) =>
            `${idx + 1}. ${role.title} at ${role.company}${
              role.startYear
                ? ` (started ~${role.startYear})`
                : ' (start year unknown)'
            }${role.isCurrent ? ' [CURRENT]' : ''}`,
        )
        .join('\n')
    : 'No career history provided'
}

Analyze the evidence and return JSON only.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  };
}

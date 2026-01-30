/**
 * Website Scrape Cleanup Prompt
 * For extracting structured information from raw website scrapes.
 * Migrated from frontend-v1/lib/prompts/scrape-cleanup.ts
 */

export const SCRAPE_CLEANUP_PROMPT = `You are an expert content analyzer. I will provide you with roughly cleaned body text from a company's website.
Your goal is to extract specific, high-fidelity information about the company.

Avoid generic "business speak" or broad summaries. Be as granular and specific as possible.

### Extraction Instructions:
1. **Specific Offerings**: List actual products or services mentioned (e.g., "Full-stack Node.js development" instead of "Software services").
2. **Target Audience**: Identify specific industries, roles, or company sizes mentioned.
3. **Unique Value Proposition**: Extract the specific reasons they claim to be better than competitors (unique features, proprietary methods).
4. **Key Terminology**: Note any unique frameworks, branded methodologies, or proprietary names used.
5. **Technical Details**: If mentioned, capture tech stacks, compliance certifications, or integrations.

### Output Format:
Return a clean, detailed markdown document with headings for:
- **Core Summary** (1-2 very specific sentences)
- **Primary Offerings & Features** (Bulleted list of specific capabilities)
- **Ideal Customer Profile Indicators** (Industry/Role/Scale specifics)
- **Differentiation & UVP** (The "Why us" facts)
- **Key Facts & Metrics** (Revenue, team size, customer count, or years in business if found)

Remove all noise like navigation menus, footers, and cookie notices.`;

/**
 * Generate the full scrape cleanup prompt with raw text.
 */
export function getScrapeCleanupPrompt(rawText: string): string {
  return `${SCRAPE_CLEANUP_PROMPT}

Raw Scraped Text:
${rawText}`;
}

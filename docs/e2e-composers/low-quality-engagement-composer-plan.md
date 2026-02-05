# Low-Quality Engagement Composer Plan

## Purpose
Detect low-quality engagement behavior (e.g., 1-word comments / freebies).

## Inputs
- Documents: `normalized_posts`, `chunk_evidence`

## Outputs
- Document: `composer_low_quality_engagement`
- Claim: `insights.low_quality_engagement`

## New Files
- src/composers/low-quality-engagement/low-quality-engagement-composer.module.ts
- src/composers/low-quality-engagement/handlers/low-quality-engagement-composer.handler.ts
- src/composers/low-quality-engagement/services/low-quality-engagement-composer.service.ts
- src/composers/low-quality-engagement/interfaces/low-quality-engagement-composer.interfaces.ts
- src/composers/low-quality-engagement/low-quality-engagement-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.LOW_QUALITY_ENGAGEMENT_COMPOSER = 'low-quality-engagement-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_LOW_QUALITY_ENGAGEMENT = 'composer_low_quality_engagement'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_LOW_QUALITY_ENGAGEMENT = 'insights.low_quality_engagement'
- src/common/interfaces/module-inputs.interface.ts
  - LowQualityEngagementComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- LowQualityEngagementType enum (ONE_WORD_COMMENT, FREEBIE_SEEKING, LINK_DROP)

## Prompt Strategy
- Use AI classification with structured output (JSON).
- Store prompts and system instructions in `low-quality-engagement-composer.constants.ts`.
- Optional heuristics only to flag candidates for the prompt.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a behavior analyst. Return ONLY valid JSON.

**User**:
Identify low-quality engagement patterns (one-word comments, freebies, link drops).

Return JSON:
{
  "lowQualityEngagement": [
    { "type": "ONE_WORD_COMMENT|FREEBIE_SEEKING|LINK_DROP", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with detected patterns
- Write Claim with confidence + evidence JSON

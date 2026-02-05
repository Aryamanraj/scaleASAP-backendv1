# Competitor Mentions Composer Plan

## Purpose
Extract competitor mentions and references.

## Inputs
- Documents: `normalized_posts`, `linkedin_profile`

## Outputs
- Document: `composer_competitor_mentions`
- Claim: `insights.competitor_mentions`

## New Files
- src/composers/competitor-mentions/competitor-mentions-composer.module.ts
- src/composers/competitor-mentions/handlers/competitor-mentions-composer.handler.ts
- src/composers/competitor-mentions/services/competitor-mentions-composer.service.ts
- src/composers/competitor-mentions/interfaces/competitor-mentions-composer.interfaces.ts
- src/composers/competitor-mentions/competitor-mentions-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.COMPETITOR_MENTIONS_COMPOSER = 'competitor-mentions-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_COMPETITOR_MENTIONS = 'composer_competitor_mentions'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_COMPETITOR_MENTIONS = 'insights.competitor_mentions'
- src/common/interfaces/module-inputs.interface.ts
  - CompetitorMentionsComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- CompetitorMentionType enum (DIRECT, INDIRECT, COMPARISON, REPLACEMENT)

## Prompt Strategy
- Use AI extraction with structured output (JSON).
- Store prompts and system instructions in `competitor-mentions-composer.constants.ts`.
- Optional regex pre-pass for obvious brand mentions.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a competitive intelligence analyst. Return ONLY valid JSON.

**User**:
Extract competitor mentions from posts/profile. Include referenced companies and context.

Return JSON:
{
  "competitorMentions": [
    { "name": "...", "type": "DIRECT|INDIRECT|COMPARISON|REPLACEMENT", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with extracted competitors
- Write Claim with confidence + evidence JSON

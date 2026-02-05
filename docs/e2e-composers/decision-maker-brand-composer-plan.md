# Decision Maker + Brand Positioning Composer Plan

## Purpose
Determine whether the person is a decision maker who cares about brand/positioning.

## Inputs
- Documents: `linkedin_profile`, `linkedin_posts`, `normalized_posts`, `digital_identity_signals`
- Claims: core identity + career role claims

## Outputs
- Document: `composer_decision_maker_brand`
- Claim: `insights.decision_maker_brand`

## New Files
- src/composers/decision-maker-brand/decision-maker-brand-composer.module.ts
- src/composers/decision-maker-brand/handlers/decision-maker-brand-composer.handler.ts
- src/composers/decision-maker-brand/services/decision-maker-brand-composer.service.ts
- src/composers/decision-maker-brand/interfaces/decision-maker-brand-composer.interfaces.ts
- src/composers/decision-maker-brand/decision-maker-brand-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.DECISION_MAKER_BRAND_COMPOSER = 'decision-maker-brand-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_DECISION_MAKER_BRAND = 'composer_decision_maker_brand'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_DECISION_MAKER_BRAND = 'insights.decision_maker_brand'
- src/common/interfaces/module-inputs.interface.ts
  - DecisionMakerBrandComposerInput
- src/observer/observer.module.ts (register handler)
- src/observer/services/module-dispatcher.service.ts (route module key)

## New Enums/Constants
- DecisionMakerBrandSignalLevel enum (HIGH, MEDIUM, LOW, UNKNOWN)
- DecisionMakerBrandEvidenceType enum (ROLE_TITLE, POST_CONTENT, ABOUT_SECTION, COMPANY_PAGE)

## Prompt Strategy
- Use AI classification with structured output (JSON).
- Store prompts and system instructions in `decision-maker-brand-composer.constants.ts`.
- Optional lightweight pre-filters (e.g., missing profile) only to short-circuit invalid inputs.

## JSON Output Handling
- Use `AIService.run` which already strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse` and log failures; if needed, apply the JSON-extraction fallback pattern used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a rigorous B2B analyst. Return ONLY valid JSON.

**User**:
Given the LinkedIn profile + posts data, determine if this person is a decision maker who cares about brand/positioning. Use evidence from title, responsibilities, posts, and about section.

Return JSON with this exact shape:
{
  "decisionMakerBrand": {
    "level": "HIGH|MEDIUM|LOW|UNKNOWN",
    "confidence": 0-1,
    "signals": [{ "type": "ROLE_TITLE|POST_CONTENT|ABOUT_SECTION|COMPANY_PAGE", "evidence": "...", "weight": 0-1 }],
    "summary": "..."
  }
}

## Persistence
- Write Document with summary + evidence
- Write Claim with confidence + evidence JSON

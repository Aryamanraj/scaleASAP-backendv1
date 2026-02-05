# Revenue Signal Composer Plan

## Purpose
Infer funded or bootstrapped yet high revenue ($100k+/month).

## Inputs
- Documents: `linkedin_profile`, `linkedin_posts`, `digital_identity_signals`
- Company info (domain, funding hints, hiring scale)

## Outputs
- Document: `composer_revenue_signal`
- Claim: `insights.revenue_signal`

## New Files
- src/composers/revenue-signal/revenue-signal-composer.module.ts
- src/composers/revenue-signal/handlers/revenue-signal-composer.handler.ts
- src/composers/revenue-signal/services/revenue-signal-composer.service.ts
- src/composers/revenue-signal/interfaces/revenue-signal-composer.interfaces.ts
- src/composers/revenue-signal/revenue-signal-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.REVENUE_SIGNAL_COMPOSER = 'revenue-signal-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_REVENUE_SIGNAL = 'composer_revenue_signal'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_REVENUE_SIGNAL = 'insights.revenue_signal'
- src/common/interfaces/module-inputs.interface.ts
  - RevenueSignalComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- RevenueSignalLevel enum (HIGH, MEDIUM, LOW, UNKNOWN)
- RevenueSignalEvidenceType enum (FUNDING, TEAM_SIZE, SALES_METRICS, CUSTOMER_LOGOS)

## Prompt Strategy
- Use AI classification with structured output (JSON).
- Store prompts and system instructions in `revenue-signal-composer.constants.ts`.
- Optional lightweight pre-filters only for empty inputs.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a rigorous growth analyst. Return ONLY valid JSON.

**User**:
Infer whether the company is funded or bootstrapped yet high revenue (>= $100k/month) based on profile, posts, and company info. Use explicit evidence only.

Return JSON:
{
  "revenueSignal": {
    "level": "HIGH|MEDIUM|LOW|UNKNOWN",
    "confidence": 0-1,
    "signals": [{ "type": "FUNDING|TEAM_SIZE|SALES_METRICS|CUSTOMER_LOGOS", "evidence": "...", "weight": 0-1 }],
    "summary": "..."
  }
}

## Persistence
- Write Document with revenue inference + evidence
- Write Claim with confidence + evidence JSON

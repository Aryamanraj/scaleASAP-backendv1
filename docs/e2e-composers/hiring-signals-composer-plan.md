# Hiring Signals Composer Plan

## Purpose
Detect hiring posts, team expansion, and welcomes.

## Inputs
- Documents: `normalized_posts`, `linkedin_profile`

## Outputs
- Document: `composer_hiring_signals`
- Claim: `insights.hiring_signals`

## New Files
- src/composers/hiring-signals/hiring-signals-composer.module.ts
- src/composers/hiring-signals/handlers/hiring-signals-composer.handler.ts
- src/composers/hiring-signals/services/hiring-signals-composer.service.ts
- src/composers/hiring-signals/interfaces/hiring-signals-composer.interfaces.ts
- src/composers/hiring-signals/hiring-signals-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.HIRING_SIGNALS_COMPOSER = 'hiring-signals-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_HIRING_SIGNALS = 'composer_hiring_signals'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_HIRING_SIGNALS = 'insights.hiring_signals'
- src/common/interfaces/module-inputs.interface.ts
  - HiringSignalsComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- HiringSignalType enum (ROLE_OPENING, TEAM_WELCOME, REFERRAL_REQUEST)

## Prompt Strategy
- Use AI classification with structured output (JSON).
- Store prompts and system instructions in `hiring-signals-composer.constants.ts`.
- Optional lightweight keyword pre-pass only to reduce token volume.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a hiring signals analyst. Return ONLY valid JSON.

**User**:
Identify hiring signals, team welcomes, and referral requests.

Return JSON:
{
  "hiringSignals": [
    { "type": "ROLE_OPENING|TEAM_WELCOME|REFERRAL_REQUEST", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with hiring signals
- Write Claim with confidence + evidence JSON

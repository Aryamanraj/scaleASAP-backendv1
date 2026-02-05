# Colleague Network Composer Plan

## Purpose
Extract colleagues mentioned and build a network list.

## Inputs
- Documents: `normalized_posts`, `linkedin_profile`

## Outputs
- Document: `composer_colleague_network`
- Claim: `insights.colleague_network`

## New Files
- src/composers/colleague-network/colleague-network-composer.module.ts
- src/composers/colleague-network/handlers/colleague-network-composer.handler.ts
- src/composers/colleague-network/services/colleague-network-composer.service.ts
- src/composers/colleague-network/interfaces/colleague-network-composer.interfaces.ts
- src/composers/colleague-network/colleague-network-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.COLLEAGUE_NETWORK_COMPOSER = 'colleague-network-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_COLLEAGUE_NETWORK = 'composer_colleague_network'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_COLLEAGUE_NETWORK = 'insights.colleague_network'
- src/common/interfaces/module-inputs.interface.ts
  - ColleagueNetworkComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- ColleagueMentionType enum (TEAMMATE, MANAGER, REPORT, PARTNER)

## Prompt Strategy
- Use AI extraction with structured output (JSON).
- Store prompts and system instructions in `colleague-network-composer.constants.ts`.
- Optional named-entity pre-pass to reduce token volume.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a relationship graph analyst. Return ONLY valid JSON.

**User**:
Extract colleagues mentioned in posts/profile and their relationship type.

Return JSON:
{
  "colleagueNetwork": [
    { "name": "...", "type": "TEAMMATE|MANAGER|REPORT|PARTNER", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with colleague list
- Write Claim with confidence + evidence JSON

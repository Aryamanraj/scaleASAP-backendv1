# External Socials Composer Plan

## Purpose
Extract other socials (Twitter/IG) and emails from mentions.

## Inputs
- Documents: `normalized_posts`, `linkedin_profile`, `digital_identity_signals`

## Outputs
- Document: `composer_external_socials`
- Claim: `insights.external_socials`

## New Files
- src/composers/external-socials/external-socials-composer.module.ts
- src/composers/external-socials/handlers/external-socials-composer.handler.ts
- src/composers/external-socials/services/external-socials-composer.service.ts
- src/composers/external-socials/interfaces/external-socials-composer.interfaces.ts
- src/composers/external-socials/external-socials-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.EXTERNAL_SOCIALS_COMPOSER = 'external-socials-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_EXTERNAL_SOCIALS = 'composer_external_socials'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_EXTERNAL_SOCIALS = 'insights.external_socials'
- src/common/interfaces/module-inputs.interface.ts
  - ExternalSocialsComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- ExternalSocialType enum (TWITTER, INSTAGRAM, GITHUB, EMAIL, WEBSITE, OTHER)

## Prompt Strategy
- Use AI extraction with structured output (JSON).
- Store prompts and system instructions in `external-socials-composer.constants.ts`.
- Optional regex pre-pass for URLs/emails to seed the prompt.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a digital footprint analyst. Return ONLY valid JSON.

**User**:
Extract external socials (Twitter/IG/GitHub), websites, and emails from the content.

Return JSON:
{
  "externalSocials": [
    { "type": "TWITTER|INSTAGRAM|GITHUB|EMAIL|WEBSITE|OTHER", "value": "...", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with extracted handles/links
- Write Claim with confidence + evidence JSON

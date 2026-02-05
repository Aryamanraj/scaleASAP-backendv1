# Design Help Signals Composer Plan

## Purpose
Detect mentions of design help, hiring designers, or product feedback requests.

## Inputs
- Documents: `normalized_posts`, `linkedin_profile`

## Outputs
- Document: `composer_design_help_signals`
- Claim: `insights.design_help_signals`

## New Files
- src/composers/design-help-signals/design-help-signals-composer.module.ts
- src/composers/design-help-signals/handlers/design-help-signals-composer.handler.ts
- src/composers/design-help-signals/services/design-help-signals-composer.service.ts
- src/composers/design-help-signals/interfaces/design-help-signals-composer.interfaces.ts
- src/composers/design-help-signals/design-help-signals-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.DESIGN_HELP_SIGNALS_COMPOSER = 'design-help-signals-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_DESIGN_HELP_SIGNALS = 'composer_design_help_signals'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_DESIGN_HELP_SIGNALS = 'insights.design_help_signals'
- src/common/interfaces/module-inputs.interface.ts
  - DesignHelpSignalsComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- DesignHelpSignalType enum (HIRING_DESIGNER, SEEKING_FEEDBACK, AGENCY_SEARCH)

## Prompt Strategy
- Use AI classification with structured output (JSON).
- Store prompts and system instructions in `design-help-signals-composer.constants.ts`.
- Optional keyword pre-pass only to reduce token volume.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a services demand analyst. Return ONLY valid JSON.

**User**:
Detect mentions of design help, hiring designers, or agency searches.

Return JSON:
{
  "designHelpSignals": [
    { "type": "HIRING_DESIGNER|SEEKING_FEEDBACK|AGENCY_SEARCH", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with design-related signals
- Write Claim with confidence + evidence JSON

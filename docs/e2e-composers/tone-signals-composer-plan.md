# Tone Signals Composer Plan

## Purpose
Infer tone of posts (anxious, excited, rage bait, etc.) and map to growth signals.

## Inputs
- Documents: `normalized_posts`, `chunk_evidence`

## Outputs
- Document: `composer_tone_signals`
- Claim: `insights.tone_signals`

## New Files
- src/composers/tone-signals/tone-signals-composer.module.ts
- src/composers/tone-signals/handlers/tone-signals-composer.handler.ts
- src/composers/tone-signals/services/tone-signals-composer.service.ts
- src/composers/tone-signals/interfaces/tone-signals-composer.interfaces.ts
- src/composers/tone-signals/tone-signals-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.TONE_SIGNALS_COMPOSER = 'tone-signals-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_TONE_SIGNALS = 'composer_tone_signals'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_TONE_SIGNALS = 'insights.tone_signals'
- src/common/interfaces/module-inputs.interface.ts
  - ToneSignalsComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- ToneLabel enum (ANXIOUS, EXCITED, RAGE_BAIT, NEUTRAL, OPTIMISTIC, PESSIMISTIC)
- GrowthSignalMapping enum (POSITIVE, NEGATIVE, NEUTRAL)

## Prompt Strategy
- Use AI tone classification with structured output (JSON).
- Store prompts and system instructions in `tone-signals-composer.constants.ts`.
- Optional sentiment pre-scores only to seed the prompt.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a language tone analyst. Return ONLY valid JSON.

**User**:
Classify tone of posts and map to growth signals.

Return JSON:
{
  "toneSignals": [
    { "tone": "ANXIOUS|EXCITED|RAGE_BAIT|NEUTRAL|OPTIMISTIC|PESSIMISTIC", "growthSignal": "POSITIVE|NEGATIVE|NEUTRAL", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with tone analysis
- Write Claim with confidence + evidence JSON

# LinkedIn Activity Composer Plan

## Purpose
Assess whether the person is fairly active on LinkedIn.

## Inputs
- Documents: `linkedin_posts`, `normalized_posts`, `personality_active_times`

## Outputs
- Document: `composer_linkedin_activity`
- Claim: `insights.linkedin_activity`

## New Files
- src/composers/linkedin-activity/linkedin-activity-composer.module.ts
- src/composers/linkedin-activity/handlers/linkedin-activity-composer.handler.ts
- src/composers/linkedin-activity/services/linkedin-activity-composer.service.ts
- src/composers/linkedin-activity/interfaces/linkedin-activity-composer.interfaces.ts
- src/composers/linkedin-activity/linkedin-activity-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.LINKEDIN_ACTIVITY_COMPOSER = 'linkedin-activity-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_LINKEDIN_ACTIVITY = 'composer_linkedin_activity'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_LINKEDIN_ACTIVITY = 'insights.linkedin_activity'
- src/common/interfaces/module-inputs.interface.ts
  - LinkedinActivityComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- ActivityLevel enum (HIGH, MEDIUM, LOW, INACTIVE)
- ActivitySignalSource enum (POST_FREQUENCY, COMMENT_FREQUENCY, RECENT_POST)

## Prompt Strategy
- Use AI classification with structured output (JSON).
- Store prompts and system instructions in `linkedin-activity-composer.constants.ts`.
- Optional deterministic signals only to seed the prompt.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a social activity analyst. Return ONLY valid JSON.

**User**:
Assess how active this person is on LinkedIn using posts and timestamps.

Return JSON:
{
  "linkedinActivity": {
    "level": "HIGH|MEDIUM|LOW|INACTIVE",
    "confidence": 0-1,
    "signals": [{ "type": "POST_FREQUENCY|COMMENT_FREQUENCY|RECENT_POST", "evidence": "...", "weight": 0-1 }],
    "summary": "..."
  }
}

## Persistence
- Write Document with activity score
- Write Claim with confidence + evidence JSON

# Event Attendance Composer Plan

## Purpose
Detect event attendance (past/upcoming).

## Inputs
- Documents: `normalized_posts`, `linkedin_profile`

## Outputs
- Document: `composer_event_attendance`
- Claim: `insights.event_attendance`

## New Files
- src/composers/event-attendance/event-attendance-composer.module.ts
- src/composers/event-attendance/handlers/event-attendance-composer.handler.ts
- src/composers/event-attendance/services/event-attendance-composer.service.ts
- src/composers/event-attendance/interfaces/event-attendance-composer.interfaces.ts
- src/composers/event-attendance/event-attendance-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.EVENT_ATTENDANCE_COMPOSER = 'event-attendance-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_EVENT_ATTENDANCE = 'composer_event_attendance'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_EVENT_ATTENDANCE = 'insights.event_attendance'
- src/common/interfaces/module-inputs.interface.ts
  - EventAttendanceComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- EventTimeframe enum (PAST, UPCOMING, ONGOING)
- EventMentionType enum (SPEAKING, ATTENDING, SPONSORING, HOSTING)

## Prompt Strategy
- Use AI extraction with structured output (JSON).
- Store prompts and system instructions in `event-attendance-composer.constants.ts`.
- Optional date parsing pre-pass to normalize event dates.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are an events analyst. Return ONLY valid JSON.

**User**:
Extract event attendance mentions with timeframe and role.

Return JSON:
{
  "eventAttendance": [
    { "event": "...", "timeframe": "PAST|UPCOMING|ONGOING", "type": "SPEAKING|ATTENDING|SPONSORING|HOSTING", "evidence": "...", "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with event mentions
- Write Claim with confidence + evidence JSON

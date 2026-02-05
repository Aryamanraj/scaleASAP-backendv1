# Topic Themes Composer Plan

## Purpose
Extract topics and themes the person actively posts about.

## Inputs
- Documents: `normalized_posts`, `chunk_evidence`

## Outputs
- Document: `composer_topic_themes`
- Claim: `insights.topic_themes`

## New Files
- src/composers/topic-themes/topic-themes-composer.module.ts
- src/composers/topic-themes/handlers/topic-themes-composer.handler.ts
- src/composers/topic-themes/services/topic-themes-composer.service.ts
- src/composers/topic-themes/interfaces/topic-themes-composer.interfaces.ts
- src/composers/topic-themes/topic-themes-composer.constants.ts

## Updates
- src/common/constants/module-keys.constants.ts
  - MODULE_KEYS.TOPIC_THEMES_COMPOSER = 'topic-themes-composer'
- src/common/types/document.types.ts
  - DocumentKind.COMPOSER_TOPIC_THEMES = 'composer_topic_themes'
- src/common/types/claim-types.ts
  - CLAIM_KEY.INSIGHTS_TOPIC_THEMES = 'insights.topic_themes'
- src/common/interfaces/module-inputs.interface.ts
  - TopicThemesComposerInput
- src/observer/observer.module.ts
- src/observer/services/module-dispatcher.service.ts

## New Enums/Constants
- TopicThemeCategory enum (BRANDING, POSITIONING, PRODUCT, MARKETING, TEAM, FUNDING, OTHER)

## Prompt Strategy
- Use AI clustering and labeling with structured output (JSON).
- Store prompts and system instructions in `topic-themes-composer.constants.ts`.
- Optional TF/IDF seed keywords to guide the prompt.

## JSON Output Handling
- Use `AIService.run` which strips markdown code fences (see [src/ai/ai.service.ts](src/ai/ai.service.ts)).
- Parse with strict `JSON.parse`; on failure, apply the JSON-extraction fallback used in outreach (see [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)).
- Prefer model response formats that enforce JSON when supported.

## AI Prompt (Template)
**System**: You are a topic modeling analyst. Return ONLY valid JSON.

**User**:
Cluster posts into themes and label each theme.

Return JSON:
{
  "topicThemes": [
    { "category": "BRANDING|POSITIONING|PRODUCT|MARKETING|TEAM|FUNDING|OTHER", "label": "...", "evidence": ["..."], "confidence": 0-1 }
  ]
}

## Persistence
- Write Document with topic clusters
- Write Claim with confidence + evidence JSON

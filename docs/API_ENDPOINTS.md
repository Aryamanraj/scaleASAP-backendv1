# scaleASAP Backend API Endpoints

This document describes the REST API endpoints available in the NestJS backend.

## Table of Contents
- [Authentication](#authentication)
- [Workspaces](#workspaces)
- [Leads](#leads)
- [AI Services](#ai-services)

---

## Authentication

All endpoints require authentication via Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_jwt_token>
```

---

## Workspaces

### Get All Workspaces
```http
GET /workspaces
```

Returns all workspaces for the authenticated user.

**Response:**
```json
{
  "success": true,
  "message": "Workspaces fetched successfully",
  "data": [
    {
      "id": 1,
      "name": "My Workspace",
      "website": "https://example.com",
      "faviconUrl": "https://...",
      "status": "ACTIVE",
      "onboardingStatus": "complete",
      "discoveryChatHistory": [...],
      "settings": {},
      "ownerUserId": 1,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Get Workspace by ID
```http
GET /workspaces/:id
```

### Create Workspace
```http
POST /workspaces
Content-Type: application/json

{
  "name": "New Workspace",
  "website": "https://example.com"
}
```

### Update Workspace
```http
PUT /workspaces/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "website": "https://new-site.com",
  "onboardingStatus": "complete"
}
```

### Delete Workspace
```http
DELETE /workspaces/:id
```

### Generate Worldview
```http
POST /workspaces/:id/worldview/generate
Content-Type: application/json

{
  "onboardingData": {
    "companyName": "Acme Inc",
    "website": "https://acme.com",
    "valueProposition": "...",
    // ... other onboarding fields
  },
  "websiteScrape": "Full website content..."
}
```

Generates a comprehensive worldview document analyzing the company's positioning, ICP, and market strategy.

**Response:**
```json
{
  "success": true,
  "message": "Worldview generated successfully",
  "data": {
    "worldview": "# Company Worldview: Acme Inc\n\n...",
    "provider": "openai"
  }
}
```

**AI Service:** `WorldviewAIService`  
**Model:** gpt-4o  
**Prompt:** `src/ai/prompts/worldview/generation.ts`

### Discovery Chat (Streaming)
```http
POST /workspaces/:id/discovery/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "I want to start ICP discovery" },
    { "role": "assistant", "content": "Great! Tell me about..." }
  ],
  "isFollowUp": false,
  "previousExperiments": [],
  "userName": "John"
}
```

Streams an AI-powered ICP discovery conversation using Server-Sent Events (SSE).

**Response (SSE Stream):**
```
data: {"type":"chunk","content":"Let me help you"}
data: {"type":"chunk","content":" identify your ICP..."}
data: {"type":"done","experiments":{"icps":[...]}}
```

**AI Service:** `DiscoveryAIService.chatStream()`  
**Model:** gpt-4o  
**Prompts:** `src/ai/prompts/discovery/*` (system.md, core.md, strategy.md, etc.)

---

## Leads

### Get Lead Messages
```http
GET /leads/:id/messages
```

Returns all generated messages for a lead.

**Response:**
```json
{
  "success": true,
  "message": "Messages fetched successfully",
  "data": [
    {
      "id": 1,
      "leadId": 123,
      "platform": "LINKEDIN",
      "messageType": "CONNECTION_REQUEST",
      "messageContent": "Hi John, I noticed...",
      "subject": null,
      "personalizationNote": "Mentioned their recent post about AI",
      "isUsed": false,
      "rating": null,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### Save Generated Message
```http
POST /leads/:id/messages
Content-Type: application/json

{
  "platform": "LINKEDIN",
  "messageType": "CONNECTION_REQUEST",
  "messageContent": "Hi John, I noticed you work at...",
  "subject": null,
  "personalizationNote": "Referenced their company"
}
```

### Delete Message
```http
DELETE /leads/:leadId/messages/:messageId
```

### Generate Custom Outreach
```http
POST /leads/:id/generate-outreach
Content-Type: application/json

{
  "platform": "LINKEDIN",
  "messageType": "FOLLOW_UP_DM",
  "customInstructions": "Focus on their recent funding round"
}
```

Generates a personalized outreach message for the lead using AI.

**Response:**
```json
{
  "success": true,
  "message": "Outreach generated successfully",
  "data": {
    "messageContent": "Hi John, congrats on the Series A...",
    "personalizationNote": "Referenced Series A funding",
    "reasoning": "Focused on growth opportunities post-funding"
  }
}
```

**AI Service:** `OutreachAIService.generateCustomOutreach()`  
**Model:** gpt-4o  
**Prompts:** `src/ai/prompts/outreach/*`

---

## AI Services

### Architecture

All AI services are located in `src/ai/services/`:

#### WorldviewAIService
- **Purpose:** Generates comprehensive company worldview documents
- **Method:** `generateWorldview(request: WorldviewGenerationRequest)`
- **Input:** Onboarding data + website scrape
- **Output:** Markdown worldview document
- **Model:** gpt-4o

#### DiscoveryAIService
- **Purpose:** Powers ICP discovery conversations
- **Methods:**
  - `chat(context, messages, userMessage)` - Single response
  - `chatStream(context, messages, userMessage)` - Streaming response
  - `generateExperiments(context, messages)` - Force experiment output
- **Input:** Conversation context + message history
- **Output:** AI responses with optional ICP experiments (JSON)
- **Model:** gpt-4o

#### OutreachAIService  
- **Purpose:** Generates personalized outreach messages
- **Methods:**
  - `analyzeActivity(leadContext, senderContext)` - Analyze if should reach out
  - `generateCustomOutreach(leadContext, senderContext, experimentContext, options)` - Generate message
- **Input:** Lead data + sender data + experiment context
- **Output:** Personalized message with reasoning
- **Model:** gpt-4o

### Prompt Organization

Prompts are modularized in `src/ai/prompts/`:

```
src/ai/prompts/
├── discovery/
│   ├── system.md          # Bot identity
│   ├── core.md            # Discovery logic
│   ├── strategy.md        # ICP strategy
│   ├── guidelines.md      # Conversation rules
│   ├── style.md           # Response style
│   ├── output.md          # JSON output format
│   ├── examples.md        # Few-shot examples
│   ├── followup.md        # Follow-up logic
│   ├── execution.md       # Execution rules
│   └── orchestrator.ts    # Combines all .md files
├── worldview/
│   └── generation.ts      # Worldview prompt
├── outreach/
│   └── [outreach prompts]
└── index.ts               # Exports all prompts
```

The `orchestrator.ts` files dynamically assemble prompts based on conversation state.

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Database Entities

### GeneratedMessages Table

Stores AI-generated outreach messages for leads.

```sql
CREATE TABLE "GeneratedMessages" (
  "GeneratedMessageID" SERIAL PRIMARY KEY,
  "LeadID" INTEGER NOT NULL REFERENCES "Leads"("LeadID") ON DELETE CASCADE,
  "Platform" VARCHAR(50) NOT NULL,  -- 'LINKEDIN' | 'EMAIL'
  "MessageType" VARCHAR(100) NOT NULL,  -- 'CONNECTION_REQUEST' | 'FOLLOW_UP_DM' | ...
  "MessageContent" TEXT NOT NULL,
  "Subject" VARCHAR(255),  -- For emails
  "PersonalizationNote" TEXT,
  "IsUsed" BOOLEAN DEFAULT false,
  "Rating" INTEGER CHECK ("Rating" >= 1 AND "Rating" <= 5),
  "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Enums:**
- `Platform`: LINKEDIN, EMAIL
- `MessageType`: CONNECTION_REQUEST, FOLLOW_UP_DM, EMAIL_COLD, EMAIL_FOLLOW_UP

**Indexes:**
- `idx_generated_messages_lead` on (LeadID)
- `idx_generated_messages_platform_type` on (Platform, MessageType)

---

## Migration from Frontend

Previously, AI prompts and logic lived in the frontend (`frontend-v1/lib/prompts/`). We migrated:

✅ **Worldview Generation**  
- Frontend: `lib/prompts/worldview.ts` → Direct OpenAI call
- Backend: `WorldviewAIService` + `/workspaces/:id/worldview/generate` endpoint

✅ **Discovery Chat**  
- Frontend: `lib/prompts/discovery/*` → Direct OpenAI streaming
- Backend: `DiscoveryAIService` + `/workspaces/:id/discovery/chat` endpoint

✅ **Outreach Messages**  
- Backend: `OutreachAIService` + `GeneratedMessages` table

**Remaining in Frontend:**
- `lib/prompts/discovery/*` - Still used by `/api/filters/regenerate` route for Wiza filter generation

---

**Last Updated:** February 3, 2026

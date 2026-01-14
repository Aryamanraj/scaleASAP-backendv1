# AI Module

Centralized AI/LLM service for scaleASAP backend.

## Architecture

- **Provider abstraction**: All LLM providers implement `AIProvider` interface
- **Currently implemented**: OpenAI (GPT-4.5, GPT-4o, GPT-4o-mini)
- **Extensible**: Add new providers by implementing `AIProvider` interface

## Usage

### 1. Import AIModule

```typescript
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
})
export class YourModule {}
```

### 2. Inject AIService

```typescript
import { AIService } from '../ai/ai.service';
import { AI_PROVIDER, AI_MODEL, AI_TASK } from '../common/types/ai.types';

@Injectable()
export class YourService {
  constructor(private aiService: AIService) {}

  async analyzeText() {
    const response = await this.aiService.run({
      provider: AI_PROVIDER.OPENAI,
      model: AI_MODEL.GPT_4_5,
      taskType: AI_TASK.TEXT_SUMMARIZATION,
      systemPrompt: 'You are a helpful assistant that summarizes text.',
      userPrompt: 'Summarize this: ...',
      temperature: 0.7,
      maxTokens: 500,
    });

    // response.rawText contains the LLM's response
    // Parse it as needed for your use case
    return response.rawText;
  }
}
```

## Configuration

Add `OPENAI_API_KEY` to your environment variables.

## Adding New Providers

1. Create provider file: `src/ai/providers/your-provider.provider.ts`
2. Implement `AIProvider` interface
3. Add provider enum to `src/common/types/ai.types.ts`
4. Register in `src/ai/ai.module.ts`
5. Add case in `src/ai/ai.service.ts` switch statement

## Design Principles

- No direct LLM SDK usage outside `src/ai/providers/*`
- All enums/types/interfaces in `src/common/*`
- Provider selection per request (not global config)
- Parsing handled by caller, not provider
- Single template string logs

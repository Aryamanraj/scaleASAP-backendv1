/**
 * AI Service
 * Centralized service for all LLM operations
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AIRequest, AIResponse } from '../common/interfaces/ai.interfaces';
import { AI_PROVIDER } from '../common/types/ai.types';
import { OpenAIProvider } from './providers/openai.provider';
import { MegaLLMProvider } from './providers/megallm.provider';

@Injectable()
export class AIService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private openaiProvider: OpenAIProvider,
    private megallmProvider: MegaLLMProvider,
  ) {}

  async run<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    try {
      this.logger.info(
        `AIService.run: Starting AI request [provider=${request.provider}, model=${request.model}, taskType=${request.taskType}]`,
      );

      let response: AIResponse;

      switch (request.provider) {
        case AI_PROVIDER.OPENAI:
          response = await this.openaiProvider.run(request);
          break;
        case AI_PROVIDER.MEGALLM:
          response = await this.megallmProvider.run(request);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${request.provider}`);
      }

      // Sanitize response to strip markdown code fences
      const sanitized = this.sanitizeAIResponse(response.rawText);
      if (sanitized.wasSanitized) {
        this.logger.info(
          `AIService.run: Sanitized AI response by stripping markdown code fences [provider=${request.provider}, model=${request.model}, taskType=${request.taskType}]`,
        );
        response.rawText = sanitized.cleanedText;
      }

      this.logger.info(
        `AIService.run: Completed AI request [provider=${request.provider}, model=${request.model}, taskType=${request.taskType}, tokensUsed=${response.tokensUsed}]`,
      );

      return response as AIResponse<T>;
    } catch (error) {
      this.logger.error(
        `AIService.run: Error [error=${error.message}, provider=${request.provider}, model=${request.model}, taskType=${request.taskType}, stack=${error.stack}]`,
      );
      throw error;
    }
  }

  /**
   * Sanitize AI response by stripping markdown code fences
   * Handles cases where LLM wraps JSON in ```json ... ``` or ``` ... ```
   */
  private sanitizeAIResponse(rawText: string): {
    cleanedText: string;
    wasSanitized: boolean;
  } {
    const trimmed = rawText.trim();

    // Check if response is wrapped in markdown code fences
    const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
    const match = trimmed.match(fencePattern);

    if (match) {
      return {
        cleanedText: match[1].trim(),
        wasSanitized: true,
      };
    }

    return {
      cleanedText: trimmed,
      wasSanitized: false,
    };
  }
}

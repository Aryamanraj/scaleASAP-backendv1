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

@Injectable()
export class AIService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private openaiProvider: OpenAIProvider,
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
        default:
          throw new Error(`Unsupported AI provider: ${request.provider}`);
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
}

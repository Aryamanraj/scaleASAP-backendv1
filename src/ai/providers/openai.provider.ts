/**
 * OpenAI Provider Implementation
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import OpenAI from 'openai';
import { AIProvider } from './ai-provider.interface';
import { AIRequest, AIResponse } from '../../common/interfaces/ai.interfaces';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    this.client = new OpenAI({ apiKey });
  }

  async run(request: AIRequest): Promise<AIResponse> {
    try {
      this.logger.info(
        `OpenAIProvider.run: Executing request [model=${request.model}, taskType=${request.taskType}]`,
      );

      const completion = await this.client.chat.completions.create({
        model: request.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 1000,
      });

      const rawText = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens;

      this.logger.info(
        `OpenAIProvider.run: Completed [model=${request.model}, tokensUsed=${tokensUsed}]`,
      );

      return {
        rawText,
        provider: request.provider,
        model: request.model,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error(
        `OpenAIProvider.run: Error [error=${error.message}, model=${request.model}, taskType=${request.taskType}]`,
      );
      throw error;
    }
  }
}

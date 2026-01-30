/**
 * Discovery AI Service
 * Handles AI-powered ICP discovery conversations.
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  getDiscoverySystemPrompt,
  parseExperimentsFromResponse,
  DiscoveryPromptContext,
} from '../prompts';

export interface DiscoveryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiscoveryChatResult {
  response: string;
  experiments?: ReturnType<typeof parseExperimentsFromResponse>;
  tokensUsed?: number;
}

@Injectable()
export class DiscoveryAIService {
  private openai: OpenAI;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('ai.openai.apiKey') ||
      this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('DiscoveryAIService: OPENAI_API_KEY not configured');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Process a discovery chat message and return AI response.
   */
  async chat(
    context: DiscoveryPromptContext,
    messages: DiscoveryMessage[],
    userMessage: string,
  ): Promise<DiscoveryChatResult> {
    try {
      this.logger.info(
        `DiscoveryAIService.chat: Processing message [turnCount=${context.turnCount}, messageCount=${messages.length}]`,
      );

      if (!this.openai) {
        throw new Error('OpenAI client not initialized - API key missing');
      }

      // Build the system prompt based on conversation context
      const systemPrompt = await getDiscoverySystemPrompt(context);

      // Build conversation history for OpenAI
      const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          { role: 'system', content: systemPrompt },
          // Add conversation history
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          // Add the new user message
          { role: 'user' as const, content: userMessage },
        ];

      const model =
        this.configService.get<string>('ai.openai.model') || 'gpt-4o';

      const completion = await this.openai.chat.completions.create({
        model,
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens;

      this.logger.info(
        `DiscoveryAIService.chat: Received response [tokensUsed=${tokensUsed}]`,
      );

      // Check if response contains experiment output
      const experiments = parseExperimentsFromResponse(response);

      if (experiments) {
        this.logger.info(
          `DiscoveryAIService.chat: Parsed ${
            experiments.icps?.length || 0
          } experiments from response`,
        );
      }

      return {
        response,
        experiments,
        tokensUsed,
      };
    } catch (error) {
      this.logger.error(`DiscoveryAIService.chat: Error - ${error.stack}`);
      throw error;
    }
  }

  /**
   * Stream a discovery chat response.
   */
  async *chatStream(
    context: DiscoveryPromptContext,
    messages: DiscoveryMessage[],
    userMessage: string,
  ): AsyncGenerator<string, DiscoveryChatResult, unknown> {
    try {
      this.logger.info(
        `DiscoveryAIService.chatStream: Starting stream [turnCount=${context.turnCount}]`,
      );

      if (!this.openai) {
        throw new Error('OpenAI client not initialized - API key missing');
      }

      const systemPrompt = await getDiscoverySystemPrompt(context);

      const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user' as const, content: userMessage },
        ];

      const model =
        this.configService.get<string>('ai.openai.model') || 'gpt-4o';

      const stream = await this.openai.chat.completions.create({
        model,
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      this.logger.info(
        `DiscoveryAIService.chatStream: Stream completed [responseLength=${fullResponse.length}]`,
      );

      // Parse experiments from full response
      const experiments = parseExperimentsFromResponse(fullResponse);

      return {
        response: fullResponse,
        experiments,
      };
    } catch (error) {
      this.logger.error(
        `DiscoveryAIService.chatStream: Error - ${error.stack}`,
      );
      throw error;
    }
  }

  /**
   * Generate ICP experiments from a completed discovery session.
   * Can be used when user requests output explicitly.
   */
  async generateExperiments(
    context: DiscoveryPromptContext,
    messages: DiscoveryMessage[],
  ): Promise<DiscoveryChatResult> {
    const outputRequest =
      'Based on our conversation, please generate the 5 ICP experiments now. Include the JSON output with the markers.';

    return this.chat(
      { ...context, turnCount: Math.max(context.turnCount, 8) },
      messages,
      outputRequest,
    );
  }
}

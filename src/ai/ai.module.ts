/**
 * AI Module
 * Provides centralized AI/LLM capabilities
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { OpenAIProvider } from './providers/openai.provider';

@Module({
  imports: [ConfigModule],
  providers: [AIService, OpenAIProvider],
  exports: [AIService],
})
export class AIModule {}

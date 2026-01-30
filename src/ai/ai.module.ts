/**
 * AI Module
 * Provides centralized AI/LLM capabilities including discovery and outreach services.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { OpenAIProvider } from './providers/openai.provider';
import { DiscoveryAIService } from './services/discovery-ai.service';
import { OutreachAIService } from './services/outreach-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [AIService, OpenAIProvider, DiscoveryAIService, OutreachAIService],
  exports: [AIService, DiscoveryAIService, OutreachAIService],
})
export class AIModule {}

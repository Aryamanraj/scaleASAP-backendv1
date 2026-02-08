/**
 * AI Module
 * Provides centralized AI/LLM capabilities including discovery, outreach, and worldview services.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { OpenAIProvider } from './providers/openai.provider';
import { MegaLLMProvider } from './providers/megallm.provider';
import { DiscoveryAIService } from './services/discovery-ai.service';
import { OutreachAIService } from './services/outreach-ai.service';
import { WorldviewAIService } from './services/worldview-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [
    AIService,
    OpenAIProvider,
    MegaLLMProvider,
    DiscoveryAIService,
    OutreachAIService,
    WorldviewAIService,
  ],
  exports: [
    AIService,
    DiscoveryAIService,
    OutreachAIService,
    WorldviewAIService,
  ],
})
export class AIModule {}

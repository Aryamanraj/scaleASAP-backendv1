/**
 * Worldview AI Service
 * Handles AI-powered worldview document generation from onboarding data.
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { WORLDVIEW_GENERATION_PROMPT } from '../prompts';

export interface WorldviewGenerationRequest {
  onboardingData: Record<string, unknown>;
  websiteScrape?: string;
}

export interface WorldviewGenerationResult {
  worldview: string;
  provider: string;
}

@Injectable()
export class WorldviewAIService {
  private openai: OpenAI;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Generate a worldview document from onboarding data and website scrape
   */
  async generateWorldview(
    request: WorldviewGenerationRequest,
  ): Promise<WorldviewGenerationResult> {
    this.logger.info('WorldviewAIService.generateWorldview: Starting', {
      hasOnboardingData: !!request.onboardingData,
      hasWebsiteScrape: !!request.websiteScrape,
    });

    try {
      const onboardingDataStr = JSON.stringify(request.onboardingData, null, 2);
      const websiteScrapeStr =
        request.websiteScrape || 'No website scrape available';

      const userPrompt = WORLDVIEW_GENERATION_PROMPT.replace(
        '{{onboardingData}}',
        onboardingDataStr,
      ).replace('{{websiteScrape}}', websiteScrapeStr);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a strategic analyst. Return your analysis in the requested markdown format.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const worldview = response.choices[0]?.message?.content || '';

      this.logger.info('WorldviewAIService.generateWorldview: Success', {
        worldviewLength: worldview.length,
        model: response.model,
      });

      return {
        worldview,
        provider: 'openai',
      };
    } catch (error) {
      this.logger.error('WorldviewAIService.generateWorldview: Error', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

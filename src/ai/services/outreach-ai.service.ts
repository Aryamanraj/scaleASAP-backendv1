/**
 * Outreach AI Service
 * Handles AI-powered outreach message generation.
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OUTREACH_SYSTEM_PROMPT, getOutreachUserPrompt } from '../prompts';

export interface OutreachResult {
  shouldReachOut: boolean;
  isWarm?: boolean;
  reason: string;
  connectionRequest?: string;
  followUpDm?: string;
  personalizationAngle?: string;
  alternative?: string;
  thinking?: OutreachThinking;
}

export interface OutreachThinking {
  whatIKnowAboutThem?: string;
  whatTheyMightCareAbout?: string;
  whyThisApproach?: string;
  risks?: string;
}

export interface LeadContext {
  name: string;
  title: string;
  company: string;
  industry?: string;
  linkedInActivity?: string[];
  recentPosts?: string[];
}

export interface SenderContext {
  companyName: string;
  productDescription: string;
  valueProposition: string;
}

export interface ExperimentContext {
  pattern: string;
  pain: string;
  trigger: string;
  outreachAngle: string;
}

@Injectable()
export class OutreachAIService {
  private openai: OpenAI;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('ai.openai.apiKey') ||
      this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OutreachAIService: OPENAI_API_KEY not configured');
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate personalized outreach for a single lead.
   */
  async generateOutreach(
    sender: SenderContext,
    lead: LeadContext,
    experimentContext?: ExperimentContext,
  ): Promise<OutreachResult> {
    try {
      this.logger.info(
        `OutreachAIService.generateOutreach: Generating for lead [name=${lead.name}, company=${lead.company}]`,
      );

      if (!this.openai) {
        throw new Error('OpenAI client not initialized - API key missing');
      }

      const userPrompt = getOutreachUserPrompt({
        senderCompany: sender.companyName,
        senderProduct: sender.productDescription,
        senderValueProp: sender.valueProposition,
        leadName: lead.name,
        leadTitle: lead.title,
        leadCompany: lead.company,
        leadIndustry: lead.industry,
        linkedInActivity: lead.linkedInActivity,
        recentPosts: lead.recentPosts,
        experimentContext,
      });

      const model =
        this.configService.get<string>('ai.openai.model') || 'gpt-4o';

      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: OUTREACH_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const rawResponse = completion.choices[0]?.message?.content || '{}';

      this.logger.info(
        `OutreachAIService.generateOutreach: Received response [tokensUsed=${completion.usage?.total_tokens}]`,
      );

      try {
        const result = JSON.parse(rawResponse) as OutreachResult;
        return result;
      } catch (parseError) {
        this.logger.error(
          `OutreachAIService.generateOutreach: Failed to parse JSON response`,
        );
        return {
          shouldReachOut: false,
          reason:
            'Failed to generate outreach - AI response was not valid JSON',
        };
      }
    } catch (error) {
      this.logger.error(
        `OutreachAIService.generateOutreach: Error - ${error.stack}`,
      );
      throw error;
    }
  }

  /**
   * Generate outreach for multiple leads in batch.
   */
  async generateOutreachBatch(
    sender: SenderContext,
    leads: LeadContext[],
    experimentContext?: ExperimentContext,
  ): Promise<Map<string, OutreachResult>> {
    this.logger.info(
      `OutreachAIService.generateOutreachBatch: Processing ${leads.length} leads`,
    );

    const results = new Map<string, OutreachResult>();

    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchPromises = batch.map(async (lead) => {
        try {
          const result = await this.generateOutreach(
            sender,
            lead,
            experimentContext,
          );
          return { leadName: lead.name, result };
        } catch (error) {
          this.logger.error(
            `OutreachAIService.generateOutreachBatch: Failed for lead ${lead.name} - ${error.message}`,
          );
          return {
            leadName: lead.name,
            result: {
              shouldReachOut: false,
              reason: `Error generating outreach: ${error.message}`,
            } as OutreachResult,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ leadName, result }) => {
        results.set(leadName, result);
      });
    }

    this.logger.info(
      `OutreachAIService.generateOutreachBatch: Completed ${results.size} outreach generations`,
    );

    return results;
  }

  /**
   * Analyze LinkedIn activity to find signals and personalization angles.
   * Matches frontend-v1/lib/content-engine/service.ts analyzeLinkedInActivity pattern.
   */
  async analyzeLinkedInActivity(
    rawActivity: string,
    senderContext?: SenderContext,
  ): Promise<{
    isActive: boolean;
    peakTime: string;
    summary: string;
    hasEngagedWithCompany?: boolean;
    relevantTopics?: string[];
    suggestedAngle?: string;
  }> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      if (!rawActivity) {
        return {
          isActive: false,
          peakTime: 'Unknown',
          summary: 'No activity data provided.',
        };
      }

      // Base activity analysis prompt from frontend-v1
      const systemPrompt =
        'You are a LinkedIn activity analyzer. Your goal is to determine if a user is active and identify their most active time of day/week based on raw activity logs.';

      let userPrompt = `Analyze this raw LinkedIn activity:
                
${rawActivity}

Return a JSON object with:
"isActive": boolean,
"peakTime": "string (e.g. Tuesday mornings)",
"summary": "brief summary of activity patterns"`;

      // If sender context provided, enhance the analysis
      if (senderContext) {
        userPrompt = `Analyze the following LinkedIn posts/activity for outreach personalization:

Company to check for mentions: ${senderContext.companyName}
Product context: ${senderContext.productDescription}

Posts/Activity:
${rawActivity}

Return a JSON object with:
"isActive": boolean,
"peakTime": "string (e.g. Tuesday mornings)",
"summary": "brief summary of activity patterns",
"hasEngagedWithCompany": boolean (did they mention ${senderContext.companyName}?),
"relevantTopics": string[] (topics relevant to the sender's product),
"suggestedAngle": "best personalization angle based on their activity"`;
      }

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('ai.openai.model') || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content || '{}';

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : content;
        const result = JSON.parse(jsonString);

        return {
          isActive: result.isActive ?? true,
          peakTime: result.peakTime || 'Recent',
          summary: result.summary || 'Active user.',
          hasEngagedWithCompany: result.hasEngagedWithCompany,
          relevantTopics: result.relevantTopics,
          suggestedAngle: result.suggestedAngle,
        };
      } catch {
        return {
          isActive: true,
          peakTime: 'Recent',
          summary: 'Active user.',
        };
      }
    } catch (error) {
      this.logger.error(
        `OutreachAIService.analyzeLinkedInActivity: Error - ${error.stack}`,
      );
      return {
        isActive: false,
        peakTime: 'Unknown',
        summary: 'Error analyzing activity.',
      };
    }
  }

  /**
   * Generate custom outreach with specific platform and message type constraints.
   * Matches frontend-v1/lib/content-engine/service.ts generateCustomOutreach pattern.
   */
  async generateCustomOutreach(
    sender: SenderContext,
    lead: LeadContext,
    platform: 'linkedin' | 'email',
    messageType: string,
    userContext?: string,
    experimentContext?: ExperimentContext,
  ): Promise<OutreachResult> {
    try {
      this.logger.info(
        `OutreachAIService.generateCustomOutreach: Generating for lead [name=${lead.name}, platform=${platform}, type=${messageType}]`,
      );

      if (!this.openai) {
        throw new Error('OpenAI client not initialized - API key missing');
      }

      // Analyze activity first
      const activityAnalysis = await this.analyzeLinkedInActivity(
        lead.linkedInActivity?.join('\n') || '',
        sender,
      );

      // Build custom user prompt with platform/type constraints
      const basePrompt = getOutreachUserPrompt({
        senderCompany: sender.companyName,
        senderProduct: sender.productDescription,
        senderValueProp: sender.valueProposition,
        leadName: lead.name,
        leadTitle: lead.title,
        leadCompany: lead.company,
        leadIndustry: lead.industry,
        linkedInActivity: lead.linkedInActivity,
        recentPosts: lead.recentPosts,
        experimentContext,
      });

      const customConstraints = `
CUSTOM CONSTRAINTS:
- Platform: ${platform}
- Message Type: ${messageType}
${
  userContext ? `- Additional Context (e.g. user response): ${userContext}` : ''
}

Please generate a message that explicitly respects these custom constraints.
The message should be optimized for the ${platform} platform and be a ${messageType}.
If the platform is 'email', ignore LinkedIn-specific constraints like character limits for connection requests, but keep the concise, conversation-first mindset.
If additional context or user response is provided, ensure the message incorporates or addresses it naturally.

Activity Analysis:
- Is Active: ${activityAnalysis.isActive}
- Peak Time: ${activityAnalysis.peakTime}
- Summary: ${activityAnalysis.summary}
${
  activityAnalysis.suggestedAngle
    ? `- Suggested Angle: ${activityAnalysis.suggestedAngle}`
    : ''
}
`;

      const model =
        this.configService.get<string>('ai.openai.model') || 'gpt-4o';

      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: OUTREACH_SYSTEM_PROMPT },
          { role: 'user', content: basePrompt + customConstraints },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const rawResponse = completion.choices[0]?.message?.content || '{}';

      this.logger.info(
        `OutreachAIService.generateCustomOutreach: Received response [tokensUsed=${completion.usage?.total_tokens}]`,
      );

      try {
        const result = JSON.parse(rawResponse) as OutreachResult;
        return result;
      } catch (parseError) {
        this.logger.error(
          `OutreachAIService.generateCustomOutreach: Failed to parse JSON response`,
        );
        return {
          shouldReachOut: false,
          reason:
            'Failed to generate outreach - AI response was not valid JSON',
        };
      }
    } catch (error) {
      this.logger.error(
        `OutreachAIService.generateCustomOutreach: Error - ${error.stack}`,
      );
      throw error;
    }
  }
}

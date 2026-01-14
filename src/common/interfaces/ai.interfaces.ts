/**
 * AI Service Interfaces
 */

import { AI_PROVIDER, AI_MODEL, AI_TASK } from '../types/ai.types';

/**
 * Request structure for AI operations
 */
export interface AIRequest {
  provider: AI_PROVIDER;
  model: AI_MODEL;
  taskType: AI_TASK;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Response structure from AI operations
 */
export interface AIResponse<T = any> {
  rawText: string;
  parsed?: T;
  provider: AI_PROVIDER;
  model: AI_MODEL;
  tokensUsed?: number;
}

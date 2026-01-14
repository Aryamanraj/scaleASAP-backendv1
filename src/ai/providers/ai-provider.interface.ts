/**
 * AI Provider Interface
 * All AI providers must implement this interface
 */

import { AIRequest, AIResponse } from '../../common/interfaces/ai.interfaces';

export interface AIProvider {
  /**
   * Execute an AI request
   * @param request - The AI request configuration
   * @returns The AI response with raw text
   */
  run(request: AIRequest): Promise<AIResponse>;
}

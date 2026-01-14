/**
 * AI Provider and Model Types
 */

export enum AI_PROVIDER {
  OPENAI = 'OPENAI',
}

export enum AI_MODEL {
  GPT_4_5 = 'gpt-4.5',
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
}

export enum AI_TASK {
  AGE_RANGE_ESTIMATION = 'AGE_RANGE_ESTIMATION',
  ALIAS_INFERENCE = 'ALIAS_INFERENCE',
  TEXT_SUMMARIZATION = 'TEXT_SUMMARIZATION',
  ENTITY_EXTRACTION = 'ENTITY_EXTRACTION',
}

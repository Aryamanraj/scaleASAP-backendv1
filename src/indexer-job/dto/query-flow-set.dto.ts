import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  AI_MODEL_MEGALLM,
  AI_MODEL_OPENAI,
  AI_PROVIDER,
} from '../../common/types/ai.types';

export class QueryFlowSetDto {
  @ApiProperty({ description: 'Flow set id to query against' })
  @IsString()
  @IsNotEmpty()
  flowSetId: string;

  @ApiProperty({ description: 'Question to answer using composed data' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question: string;

  @ApiPropertyOptional({ description: 'AI provider to use', enum: AI_PROVIDER })
  @IsOptional()
  @IsEnum(AI_PROVIDER)
  provider?: AI_PROVIDER;

  @ApiPropertyOptional({
    description: 'AI model to use for the provider',
    oneOf: [
      {
        enum: Object.values(AI_MODEL_OPENAI),
        description: 'OpenAI models',
      },
      {
        enum: Object.values(AI_MODEL_MEGALLM),
        description: 'MegaLLM models',
      },
    ],
  })
  @IsOptional()
  @IsIn([
    ...Object.values(AI_MODEL_OPENAI),
    ...Object.values(AI_MODEL_MEGALLM),
  ])
  model?: AI_MODEL_OPENAI | AI_MODEL_MEGALLM;
}

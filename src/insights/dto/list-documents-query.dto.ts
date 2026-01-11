import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import {
  DocumentSource,
  DocumentSourceType,
} from '../../common/types/claim-types';

export class ListDocumentsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by document source',
    enum: DocumentSource,
    example: DocumentSource.MANUAL,
  })
  @IsOptional()
  @IsEnum(DocumentSource)
  source?: DocumentSourceType;

  @ApiPropertyOptional({
    description: 'Maximum number of documents to return',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of documents to skip for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

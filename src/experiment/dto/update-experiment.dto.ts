import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ExperimentStatus } from '../../common/constants/entity.constants';

export class UpdateExperimentDto {
  @ApiPropertyOptional({
    description: 'Experiment name',
    example: 'Enterprise SaaS CTOs v2',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Experiment description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Target persona pattern',
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({
    description: 'Target industries',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({
    description: 'Wiza search filters (JSON)',
  })
  @IsOptional()
  @IsObject()
  wizaFilters?: object;

  @ApiPropertyOptional({
    description: 'Experiment status',
    enum: Object.values(ExperimentStatus),
  })
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;
}

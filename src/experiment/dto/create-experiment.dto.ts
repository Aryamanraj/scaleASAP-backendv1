import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ExperimentType } from '../../common/constants/entity.constants';

export class CreateExperimentDto {
  @ApiProperty({
    description: 'Experiment type',
    enum: Object.values(ExperimentType),
    example: ExperimentType.BULLSEYE,
  })
  @IsEnum(ExperimentType)
  type: ExperimentType;

  @ApiProperty({
    description: 'Experiment name',
    example: 'Enterprise SaaS CTOs',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Experiment description',
    example: 'CTOs at enterprise SaaS companies with 500+ employees',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Target persona pattern',
    example: 'CTO|Chief Technology Officer|VP Engineering',
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({
    description: 'Target industries',
    example: ['Technology', 'SaaS', 'Enterprise Software'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional({
    description: 'Wiza search filters (JSON)',
    example: {
      current_title_v2_job_functions: ['Engineering'],
      current_company_v2_employee_count_range: ['501-1000'],
    },
  })
  @IsOptional()
  @IsObject()
  wizaFilters?: object;
}

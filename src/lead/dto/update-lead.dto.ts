import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsObject,
  IsNumber,
} from 'class-validator';
import { LeadStatus } from '../../common/constants/entity.constants';

export class UpdateLeadDto {
  @ApiPropertyOptional({
    description: 'Full name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Current job title',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Current company',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @ApiPropertyOptional({
    description: 'Lead status',
    enum: Object.values(LeadStatus),
  })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    description: 'ICP match score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  icpScore?: number;

  @ApiPropertyOptional({
    description: 'Notes about the lead',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Raw enrichment data (JSON)',
  })
  @IsOptional()
  @IsObject()
  enrichmentData?: object;
}

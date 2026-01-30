import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  IsNumber,
} from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({
    description: 'LinkedIn profile URL',
    example: 'https://www.linkedin.com/in/johndoe',
    maxLength: 512,
  })
  @IsString()
  @MaxLength(512)
  linkedinUrl: string;

  @ApiPropertyOptional({
    description: 'Full name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'First name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

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
    description: 'Profile picture URL',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  profilePictureUrl?: string;

  @ApiPropertyOptional({
    description: 'Location',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn headline',
  })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn summary/about',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Raw enrichment data from Wiza/API (JSON)',
  })
  @IsOptional()
  @IsObject()
  enrichmentData?: object;
}

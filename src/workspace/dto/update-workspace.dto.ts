import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  MaxLength,
  IsEnum,
} from 'class-validator';
import {
  ProjectStatus,
  OnboardingStatus,
} from '../../common/constants/entity.constants';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({
    description: 'Name of the workspace',
    example: 'Acme Corp',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://acme.com',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(512)
  website?: string;

  @ApiPropertyOptional({
    description: 'Company favicon URL',
    example: 'https://acme.com/favicon.ico',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Favicon URL must be a valid URL' })
  @MaxLength(512)
  faviconUrl?: string;

  @ApiPropertyOptional({
    description: 'Workspace status',
    enum: Object.values(ProjectStatus),
    example: ProjectStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    description: 'Onboarding status',
    enum: Object.values(OnboardingStatus),
    example: OnboardingStatus.COMPLETE,
  })
  @IsOptional()
  @IsEnum(OnboardingStatus)
  onboardingStatus?: OnboardingStatus;

  @ApiPropertyOptional({
    description: 'Workspace settings (JSON object)',
    example: { theme: 'dark', notifications: true },
  })
  @IsOptional()
  settings?: object;
}

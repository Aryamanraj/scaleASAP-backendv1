import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class GenerateWorldviewDto {
  @ApiProperty({
    description: 'Onboarding data object',
    example: { companyName: 'Acme Inc', website: 'https://acme.com' },
  })
  @IsObject()
  onboardingData: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Website scrape content',
    example: 'Company description from website...',
  })
  @IsOptional()
  @IsString()
  websiteScrape?: string;
}

export class WorldviewResponseDto {
  @ApiProperty({ description: 'Generated worldview document' })
  worldview: string;

  @ApiProperty({ description: 'AI provider used' })
  provider: string;
}

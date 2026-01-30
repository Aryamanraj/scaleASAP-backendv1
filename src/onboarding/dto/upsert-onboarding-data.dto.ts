import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

/**
 * DTO for upserting onboarding data.
 * The `data` field contains the onboarding questionnaire answers in JSON format.
 */
export class UpsertOnboardingDataDto {
  @ApiProperty({
    description: 'Onboarding questionnaire data as JSON object',
    example: {
      companyName: 'Acme Corp',
      website: 'https://acme.com',
      companyType: 'services',
      userName: 'John Doe',
      coreOffer: 'We help businesses scale...',
    },
  })
  @IsObject()
  data: object;

  @ApiPropertyOptional({
    description: 'Whether to mark onboarding as complete',
    example: false,
  })
  @IsOptional()
  markComplete?: boolean;
}

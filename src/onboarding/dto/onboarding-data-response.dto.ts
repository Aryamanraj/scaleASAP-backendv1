import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OnboardingDataResponseDto {
  @ApiProperty({ description: 'Onboarding data ID' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Workspace ID' })
  @Expose()
  workspaceId: number;

  @ApiProperty({ description: 'Onboarding questionnaire data' })
  @Expose()
  data: object;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;
}

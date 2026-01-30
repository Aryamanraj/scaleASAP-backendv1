import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { LeadOutcome } from '../../common/constants/entity.constants';

export class LogOutcomeDto {
  @ApiProperty({
    description: 'Outcome of the lead',
    enum: Object.values(LeadOutcome),
    example: LeadOutcome.INTERESTED,
  })
  @IsEnum(LeadOutcome)
  outcome: LeadOutcome;

  @ApiPropertyOptional({
    description: 'Notes about the outcome',
    example: 'Scheduled a demo call for next week',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

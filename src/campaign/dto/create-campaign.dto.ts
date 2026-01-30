import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  MaxLength,
  IsObject,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Q1 Enterprise Outreach',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Experiment ID this campaign is based on',
    example: 1,
  })
  @IsInt()
  experimentId: number;

  @ApiPropertyOptional({
    description: 'Campaign description',
    example: 'Outreach campaign targeting enterprise CTOs',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Campaign settings (JSON)',
    example: { dailyLimit: 50, autoFollow: true },
  })
  @IsOptional()
  @IsObject()
  settings?: object;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsObject,
} from 'class-validator';
import { CampaignStatus } from '../../common/constants/entity.constants';

export class UpdateCampaignDto {
  @ApiPropertyOptional({
    description: 'Campaign name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Campaign description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Campaign status',
    enum: Object.values(CampaignStatus),
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description: 'Campaign settings (JSON)',
  })
  @IsOptional()
  @IsObject()
  settings?: object;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CampaignStatus } from '../../common/constants/entity.constants';

export class CampaignStatsDto {
  @ApiProperty({ description: 'Total leads in campaign' })
  @Expose()
  totalLeads: number;

  @ApiProperty({ description: 'Leads contacted' })
  @Expose()
  contacted: number;

  @ApiProperty({ description: 'Leads responded' })
  @Expose()
  responded: number;

  @ApiProperty({ description: 'Leads converted' })
  @Expose()
  converted: number;

  @ApiProperty({ description: 'Response rate percentage' })
  @Expose()
  responseRate: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  @Expose()
  conversionRate: number;
}

export class CampaignResponseDto {
  @ApiProperty({ description: 'Campaign ID' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Campaign name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Campaign status',
    enum: Object.values(CampaignStatus),
  })
  @Expose()
  status: CampaignStatus;

  @ApiProperty({ description: 'Workspace ID' })
  @Expose()
  workspaceId: number;

  @ApiProperty({ description: 'Experiment ID' })
  @Expose()
  experimentId: number;

  @ApiPropertyOptional({ description: 'Campaign settings' })
  @Expose()
  settings?: object;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Campaign statistics',
    type: CampaignStatsDto,
  })
  @Expose()
  @Type(() => CampaignStatsDto)
  stats?: CampaignStatsDto;
}

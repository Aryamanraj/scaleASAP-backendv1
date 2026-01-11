import { ApiProperty } from '@nestjs/swagger';
import { Claim } from '../../repo/entities/claim.entity';

export class ClaimsPageDto {
  @ApiProperty({ type: [Claim], description: 'Array of claims' })
  items: Claim[];

  @ApiProperty({ description: 'Total number of claims matching the filter' })
  total: number;

  @ApiProperty({ description: 'Limit applied to the query' })
  limit: number;

  @ApiProperty({ description: 'Offset applied to the query' })
  offset: number;
}

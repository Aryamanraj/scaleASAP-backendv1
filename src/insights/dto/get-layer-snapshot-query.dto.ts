import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

export class GetLayerSnapshotQueryDto {
  @ApiPropertyOptional({
    description:
      'Specific snapshot version to retrieve. If omitted, returns latest.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

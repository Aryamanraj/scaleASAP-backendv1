import { ApiProperty } from '@nestjs/swagger';

export class LayerInfoDto {
  @ApiProperty({ description: 'Layer number' })
  layerNumber: number;

  @ApiProperty({ description: 'Latest snapshot version for this layer' })
  latestSnapshotVersion: number;

  @ApiProperty({ description: 'When the latest snapshot was generated' })
  generatedAt: string;

  @ApiProperty({ description: 'LayerSnapshotID of the latest snapshot' })
  layerSnapshotId: number;
}

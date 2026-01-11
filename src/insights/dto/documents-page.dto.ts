import { ApiProperty } from '@nestjs/swagger';
import { Document } from '../../repo/entities/document.entity';

export class DocumentsPageDto {
  @ApiProperty({ type: [Document], description: 'Array of documents' })
  items: Document[];

  @ApiProperty({ description: 'Total number of documents matching the filter' })
  total: number;

  @ApiProperty({ description: 'Limit applied to the query' })
  limit: number;

  @ApiProperty({ description: 'Offset applied to the query' })
  offset: number;
}

import { IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvalidateDocumentDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  documentId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  invalidatedByUserId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

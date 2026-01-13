import { IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateDocumentDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  documentId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  validatedByUserId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

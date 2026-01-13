import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  DocumentSource,
  DocumentKind,
} from '../../common/types/document.types';

export class ListDocumentsQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  personId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(DocumentSource)
  source?: DocumentSource;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(DocumentKind)
  documentKind?: DocumentKind;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isValid?: boolean;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

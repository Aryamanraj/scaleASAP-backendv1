import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateIndexerFlowsDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  triggeredByUserId?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  profileUrls: string[];

  @ApiProperty({ required: false, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  flowKey?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyDomain?: string;

  @ApiProperty({ required: false, maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  companyDescription?: string;

  @ApiProperty({ required: false, maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  experimentDescription?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateIndexerFlowDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  personId: number;

  @ApiProperty({ maxLength: 512 })
  @IsString()
  @MaxLength(512)
  profileUrl: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  triggeredByUserId: number;

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

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  filterInstructions?: string;
}

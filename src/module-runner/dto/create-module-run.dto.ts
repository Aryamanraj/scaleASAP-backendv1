import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  IsObject,
} from 'class-validator';

export class CreateModuleRunDto {
  @ApiProperty({ maxLength: 128 })
  @IsString()
  @MaxLength(128)
  moduleKey: string;

  @ApiProperty({ required: false, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  moduleVersion?: string;

  @ApiProperty({ type: Object })
  @IsNotEmpty()
  @IsObject()
  inputConfigJson: any;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  triggeredByUserId: number;
}

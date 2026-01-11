import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModuleType } from '../../common/constants/entity.constants';

export class ListModulesQueryDto {
  @ApiProperty({ required: false, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  moduleKey?: string;

  @ApiProperty({ enum: Object.values(ModuleType), required: false })
  @IsOptional()
  @IsEnum(ModuleType)
  moduleType?: ModuleType;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isEnabled?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import {
  ModuleType,
  ModuleScope,
} from '../../common/constants/entity.constants';

export class RegisterModuleDto {
  @ApiProperty({ maxLength: 128 })
  @IsString()
  @MaxLength(128)
  moduleKey: string;

  @ApiProperty({ enum: Object.values(ModuleType) })
  @IsEnum(ModuleType)
  moduleType: ModuleType;

  @ApiProperty({ enum: Object.values(ModuleScope), required: false })
  @IsOptional()
  @IsEnum(ModuleScope)
  scope?: ModuleScope;

  @ApiProperty({ maxLength: 32 })
  @IsString()
  @MaxLength(32)
  version: string;

  @ApiProperty()
  configSchemaJson: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

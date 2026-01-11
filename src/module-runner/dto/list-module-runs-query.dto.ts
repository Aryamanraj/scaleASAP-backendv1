import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModuleRunStatus } from '../../common/constants/entity.constants';

export class ListModuleRunsQueryDto {
  @ApiProperty({ enum: Object.values(ModuleRunStatus), required: false })
  @IsOptional()
  @IsEnum(ModuleRunStatus)
  status?: ModuleRunStatus;

  @ApiProperty({ required: false, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  moduleKey?: string;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

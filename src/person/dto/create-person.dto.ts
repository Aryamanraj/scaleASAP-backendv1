import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { EntityStatus } from '../../common/constants/entity.constants';

export class CreatePersonDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryDisplayName?: string;

  @ApiProperty({ enum: Object.values(EntityStatus), required: false })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiProperty()
  @IsNumber()
  createdByUserId: number;
}

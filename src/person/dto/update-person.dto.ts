import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { EntityStatus } from '../../common/constants/entity.constants';

export class UpdatePersonDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryDisplayName?: string;

  @ApiProperty({ enum: Object.values(EntityStatus), required: false })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

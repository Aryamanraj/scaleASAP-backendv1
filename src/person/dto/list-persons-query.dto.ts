import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { EntityStatus } from '../../common/constants/entity.constants';

export class ListPersonsQueryDto {
  @ApiProperty({ enum: Object.values(EntityStatus), required: false })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  createdByUserId?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class AttachPersonToProjectDto {
  @ApiProperty({ required: false, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string;

  @ApiProperty()
  @IsNumber()
  createdByUserId: number;
}

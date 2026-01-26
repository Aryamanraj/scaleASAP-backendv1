import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { EntityStatus } from '../../common/constants/entity.constants';

export class CreatePersonDto {
  @ApiProperty({
    description: 'LinkedIn profile URL (required, used as unique identifier)',
    example: 'https://www.linkedin.com/in/johndoe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  linkedinUrl: string;

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

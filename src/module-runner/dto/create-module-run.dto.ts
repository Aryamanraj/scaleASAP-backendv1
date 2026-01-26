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

/**
 * DTO for creating PROJECT_LEVEL module runs.
 * triggeredByUserId is optional since these runs may be admin-initiated.
 */
export class CreateProjectLevelModuleRunDto {
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

  @ApiProperty({
    required: false,
    description: 'Optional user ID who triggered this run',
  })
  @IsOptional()
  @IsNumber()
  triggeredByUserId?: number;
}

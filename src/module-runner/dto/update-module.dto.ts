import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateModuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  configSchemaJson?: any;
}

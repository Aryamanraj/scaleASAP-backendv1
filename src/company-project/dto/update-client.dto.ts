import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateClientDto {
  @ApiProperty({
    description: 'Client name',
    example: 'Acme Corporation',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Client slug (unique identifier)',
    example: 'acme-corp',
    required: false,
  })
  @IsOptional()
  @IsString()
  slug?: string;
}

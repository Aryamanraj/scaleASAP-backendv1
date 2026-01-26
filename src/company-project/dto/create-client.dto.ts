import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    description: 'Client name',
    example: 'Acme Corporation',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Client slug (unique identifier)',
    example: 'acme-corp',
    required: false,
  })
  @IsOptional()
  @IsString()
  slug?: string;
}

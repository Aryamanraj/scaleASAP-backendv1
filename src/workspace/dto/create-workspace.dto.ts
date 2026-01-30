import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Name of the workspace (company name)',
    example: 'Acme Corp',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Company website URL',
    example: 'https://acme.com',
    maxLength: 512,
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @MaxLength(512)
  website?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class ListClaimsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific claim type',
    example: 'CORE_IDENTITY_LEGAL_NAME',
  })
  @IsOptional()
  @IsString()
  claimType?: string;

  @ApiPropertyOptional({
    description: 'Show only active claims (SupersededAt IS NULL)',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum number of claims to return',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of claims to skip for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

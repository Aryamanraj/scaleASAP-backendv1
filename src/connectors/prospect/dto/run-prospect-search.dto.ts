import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  IsObject,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SCRAPER_PROVIDER } from '../../../common/types/scraper.types';

export class RunProspectSearchDto {
  @ApiProperty({
    enum: SCRAPER_PROVIDER,
    description: 'Scraper provider to use',
    example: SCRAPER_PROVIDER.PROSPECT,
  })
  @IsEnum(SCRAPER_PROVIDER)
  @IsNotEmpty()
  provider: SCRAPER_PROVIDER;

  @ApiProperty({
    type: Object,
    description: 'Provider-specific search payload passed through as-is',
    example: {
      job_titles: ['Software Engineer', 'Senior Developer'],
      location: 'San Francisco',
      company_size: ['51-200', '201-500'],
    },
  })
  @IsObject()
  @IsNotEmpty()
  payload: any;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Maximum number of pages to fetch',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxPages?: number;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 10000,
    default: 500,
    description: 'Maximum number of items to retrieve',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxItems?: number;

  @ApiProperty({
    required: false,
    default: 'search',
    description: 'Optional deduplication key for fingerprinting',
  })
  @IsOptional()
  @IsString()
  dedupeKey?: string;
}

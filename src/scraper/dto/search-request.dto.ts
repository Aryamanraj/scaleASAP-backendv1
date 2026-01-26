import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SCRAPER_PROVIDER } from '../../common/types/scraper.types';

export class SearchRequestDto {
  @ApiProperty({
    description: 'Scraper provider to use',
    enum: SCRAPER_PROVIDER,
    example: SCRAPER_PROVIDER.PROSPECT,
  })
  @IsEnum(SCRAPER_PROVIDER)
  provider: SCRAPER_PROVIDER;

  @ApiProperty({
    description: 'Search payload/query',
    example: {
      query: {
        keywords: ['software engineer', 'developer'],
        location: { city: 'San Francisco' },
      },
    },
  })
  @IsObject()
  payload: any;

  @ApiProperty({
    description: 'Maximum number of pages to fetch',
    required: false,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxPages?: number;

  @ApiProperty({
    description: 'Maximum number of items to retrieve',
    required: false,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxItems?: number;

  @ApiProperty({
    description: 'Override page size',
    required: false,
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSizeOverride?: number;

  @ApiProperty({
    description:
      'Fetch detailed profile data for each result (skills, education, work history)',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enrichProfiles?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { SCRAPER_PROVIDER } from '../../common/types/scraper.types';

export class ScrapeRequestDto {
  @ApiProperty({
    description: 'Scraper provider to use',
    enum: SCRAPER_PROVIDER,
    example: SCRAPER_PROVIDER.PROSPECT,
  })
  @IsEnum(SCRAPER_PROVIDER)
  provider: SCRAPER_PROVIDER;

  @ApiProperty({
    description: 'Task type identifier',
    example: 'search_prospects',
  })
  @IsString()
  taskType: string;

  @ApiProperty({
    description: 'Request payload/configuration',
    example: { query: { keywords: 'developer' } },
  })
  @IsObject()
  payload: any;

  @ApiProperty({
    description: 'Additional options',
    required: false,
    example: { maxRetries: 3, timeout: 30000 },
  })
  @IsOptional()
  @IsObject()
  options?: any;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ArrayNotEmpty,
} from 'class-validator';

export class LinkedinProfileScrapeRequestDto {
  @ApiProperty({
    description: 'LinkedIn profile URLs or URNs to scrape',
    example: [
      'https://linkedin.com/in/user1',
      'urn:li:fsd_profile:ACoAADLouDABXcHwMGdmAmxuQZhb-6xBjKFmJ-E',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  urls: string[];

  @ApiProperty({
    description: 'Optional scraper options',
    required: false,
    example: { minDelayMs: 1000, maxDelayMs: 3000, saveToFile: false },
  })
  @IsOptional()
  @IsObject()
  options?: {
    minDelayMs?: number;
    maxDelayMs?: number;
    saveToFile?: boolean;
    outputDir?: string;
  };
}

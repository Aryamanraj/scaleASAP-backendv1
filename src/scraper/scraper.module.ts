/**
 * Scraper Module
 * Provides centralized web scraping capabilities
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { ProspectProvider } from './providers/prospect.provider';

@Module({
  imports: [ConfigModule],
  controllers: [ScraperController],
  providers: [ScraperService, ProspectProvider],
  exports: [ScraperService],
})
export class ScraperModule {}

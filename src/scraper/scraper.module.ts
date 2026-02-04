/**
 * Scraper Module
 * Provides centralized web scraping capabilities
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { ProspectProvider } from './providers/prospect.provider';
import { LinkedinProvider } from './providers/linkedin.provider';
import { RepoModule } from '../repo/repo.module';

@Module({
  imports: [ConfigModule, RepoModule],
  controllers: [ScraperController],
  providers: [ScraperService, ProspectProvider, LinkedinProvider],
  exports: [ScraperService],
})
export class ScraperModule {}

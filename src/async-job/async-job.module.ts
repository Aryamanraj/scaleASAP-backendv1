/**
 * Async Job Module
 * Provides job queue management and processing.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueNames } from '../common/constants';
import { AsyncJobService } from './async-job.service';
import { AsyncJobController } from './async-job.controller';
import { LeadEnrichmentConsumer } from './consumers/lead-enrichment.consumer';
import { AuthModule } from '../auth/auth.module';
import { RepoModule } from '../repo/repo.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule, // Required for SupabaseAuthGuard
    RepoModule, // Required for SupabaseAuthGuard dependencies (UserRepoService, ClientRepoService)
    // Register all new queues
    BullModule.registerQueueAsync({
      name: QueueNames.DISCOVERY,
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: QueueNames.OUTREACH,
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: QueueNames.LEAD_ENRICHMENT,
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: QueueNames.WEBSITE_SCRAPER,
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: QueueNames.CAMPAIGN_SCALE,
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: QueueNames.DATA_EXPORT,
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AsyncJobController],
  providers: [
    AsyncJobService,
    LeadEnrichmentConsumer,
    // TODO: Add more consumers as needed
    // DiscoveryConsumer,
    // OutreachConsumer,
    // WebsiteScraperConsumer,
    // CampaignScaleConsumer,
    // DataExportConsumer,
  ],
  exports: [AsyncJobService],
})
export class AsyncJobModule {}

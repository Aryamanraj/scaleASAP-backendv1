import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DBModule } from '../db/db.module';
import configuration from 'config/configuration';
import { RepoModule, entities } from '../repo/repo.module';
import { QueueModule } from '../queue/queue.module';
import { WinstonModule } from 'nest-winston';
import * as path from 'path';
import * as winston from 'winston';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from '../admin/admin.module';
import { HealthCheckModule } from '../health/health.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyProjectModule } from '../company-project/company-project.module';
import { UserModule } from '../user/user.module';
import { PersonModule } from '../person/person.module';
import { ModuleRunnerModule } from '../module-runner/module-runner.module';
import { InsightsModule } from '../insights/insights.module';
import { DocumentsModule } from '../documents/documents.module';
import { ScraperModule } from '../scraper/scraper.module';
// New workspace/campaign modules
import { WorkspaceModule } from '../workspace/workspace.module';
import { ExperimentModule } from '../experiment/experiment.module';
import { CampaignModule } from '../campaign/campaign.module';
import { LeadModule } from '../lead/lead.module';
import { AsyncJobModule } from '../async-job/async-job.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf((info) => {
          const message = `${info.timestamp} ${info.level.toUpperCase()}: ${
            info.message
          }`;
          if (info.level === 'error') {
            return winston.format.colorize().colorize('error', message);
          }
          if (info.level === 'warn') {
            return winston.format.colorize().colorize('warn', message);
          }
          return message;
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.colorize({ all: true }),
        }),
        new winston.transports.File({
          dirname: path.join('logs/'),
          filename: 'error.log',
          level: 'error',
        }),
        new winston.transports.File({
          dirname: path.join('logs/'),
          filename: 'warnings.log',
          level: 'warn',
        }),
        new winston.transports.File({
          dirname: path.join('logs/'),
          filename: 'combined.log',
        }),
      ],
    }),
    DBModule.forRoot({
      entities: entities,
    }),
    HealthCheckModule,
    ScheduleModule.forRoot(),
    RepoModule,
    QueueModule.forRoot(),
    AdminModule,
    AuthModule,
    CompanyProjectModule,
    UserModule,
    PersonModule,
    ModuleRunnerModule,
    InsightsModule,
    DocumentsModule,
    ScraperModule,
    // New workspace/campaign modules
    WorkspaceModule,
    ExperimentModule,
    CampaignModule,
    LeadModule,
    AsyncJobModule,
    OnboardingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

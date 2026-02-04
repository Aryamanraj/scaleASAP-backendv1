/**
 * Database Seed Service
 * Seeds essential data like modules on application startup
 */

import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MODULE_KEYS } from '../common/constants/module-keys.constants';

interface ModuleSeed {
  moduleKey: string;
  moduleType: 'CONNECTOR' | 'ENRICHER' | 'COMPOSER';
  version: string;
  isEnabled: boolean;
}

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const autoSeed = this.configService.get<string>('AUTO_SEED') !== 'false';
    if (autoSeed) {
      await this.seedModules();
    }
  }

  async seedModules(): Promise<void> {
    try {
      this.logger.info('SeedService: Starting module seeding');

      const modules: ModuleSeed[] = [
        // CONNECTORS
        {
          moduleKey: MODULE_KEYS.LINKEDIN_PROFILE_CONNECTOR,
          moduleType: 'CONNECTOR',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.MANUAL_DOCUMENT_CONNECTOR,
          moduleType: 'CONNECTOR',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.PROSPECT_SEARCH_CONNECTOR,
          moduleType: 'CONNECTOR',
          version: 'v1',
          isEnabled: true,
        },

        // ENRICHERS
        {
          moduleKey: MODULE_KEYS.CONTENT_CHUNKER,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LINKEDIN_POSTS_CHUNK_EVIDENCE_EXTRACTOR,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LINKEDIN_POSTS_NORMALIZER,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.PERSONALITY_ACTIVE_TIMES_REDUCER,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LINKEDIN_DIGITAL_IDENTITY_ENRICHER,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LINKEDIN_CORE_IDENTITY_ENRICHER,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.CORE_IDENTITY_ENRICHER,
          moduleType: 'ENRICHER',
          version: 'v1',
          isEnabled: true,
        },

        // COMPOSERS
        {
          moduleKey: MODULE_KEYS.DECISION_MAKER_BRAND_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.REVENUE_SIGNAL_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LINKEDIN_ACTIVITY_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.COMPETITOR_MENTIONS_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.HIRING_SIGNALS_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.TOPIC_THEMES_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.TONE_SIGNALS_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.COLLEAGUE_NETWORK_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.EXTERNAL_SOCIALS_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.EVENT_ATTENDANCE_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LOW_QUALITY_ENGAGEMENT_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.DESIGN_HELP_SIGNALS_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.FINAL_SUMMARY_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.LAYER_1_COMPOSER,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
        {
          moduleKey: MODULE_KEYS.NOOP_MODULE,
          moduleType: 'COMPOSER',
          version: 'v1',
          isEnabled: true,
        },
      ];

      let seededCount = 0;
      let skippedCount = 0;

      for (const module of modules) {
        const exists = await this.dataSource.query(
          `SELECT "ModuleID" FROM "Modules" WHERE "ModuleKey" = $1 AND "Version" = $2 LIMIT 1`,
          [module.moduleKey, module.version],
        );

        if (exists.length > 0) {
          this.logger.info(
            `SeedService: Module already exists [moduleKey=${module.moduleKey}, version=${module.version}]`,
          );
          skippedCount++;
          continue;
        }

        await this.dataSource.query(
          `INSERT INTO "Modules" ("ModuleKey", "ModuleType", "Version", "Scope", "ConfigSchemaJson", "IsEnabled", "CreatedAt", "UpdatedAt")
           VALUES ($1, $2, $3, 'PERSON_LEVEL', '{}', $4, NOW(), NOW())`,
          [
            module.moduleKey,
            module.moduleType,
            module.version,
            module.isEnabled,
          ],
        );

        this.logger.info(
          `SeedService: Seeded module [moduleKey=${module.moduleKey}, moduleType=${module.moduleType}, version=${module.version}]`,
        );
        seededCount++;
      }

      this.logger.info(
        `SeedService: Module seeding complete [seeded=${seededCount}, skipped=${skippedCount}, total=${modules.length}]`,
      );
    } catch (error) {
      this.logger.error(
        `SeedService: Error seeding modules [error=${error.message}]`,
      );
      throw error;
    }
  }
}

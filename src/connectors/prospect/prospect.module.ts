import { Module } from '@nestjs/common';
import { RepoModule } from '../../repo/repo.module';
import { ScraperModule } from '../../scraper/scraper.module';
import { ProspectSearchConnectorHandler } from './handlers/prospect-search-connector.handler';
import { ProspectSearchConnectorService } from './services/prospect-search-connector.service';
import { ProspectFanoutService } from './services/prospect-fanout.service';
import { ProspectPersonUpsertService } from './services/prospect-person-upsert.service';
import { LinkedinProfileWizaEnrichedConnectorHandler } from '../wiza/handlers/linkedin-profile-wiza-enriched-connector.handler';

@Module({
  imports: [RepoModule, ScraperModule],
  providers: [
    ProspectSearchConnectorHandler,
    ProspectSearchConnectorService,
    ProspectFanoutService,
    ProspectPersonUpsertService,
    LinkedinProfileWizaEnrichedConnectorHandler,
  ],
  exports: [
    ProspectSearchConnectorHandler,
    ProspectSearchConnectorService,
    ProspectFanoutService,
    ProspectPersonUpsertService,
    LinkedinProfileWizaEnrichedConnectorHandler,
  ],
})
export class ProspectModule {}

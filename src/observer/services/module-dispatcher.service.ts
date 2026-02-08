import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../repo/entities/module-run.entity';
import { Module } from '../../repo/entities/module.entity';
import { ModuleRepoService } from '../../repo/module-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { ModuleScope } from '../../common/constants/entity.constants';
import { NoopModuleHandler } from './handlers/noop-module.handler';
import { ManualDocumentConnectorHandler } from './handlers/manual-document-connector.handler';
import { CoreIdentityEnricherHandler } from './handlers/core-identity-enricher.handler';
import { Layer1ComposerHandler } from './handlers/layer-1-composer.handler';
import { DecisionMakerBrandComposerHandler } from './handlers/decision-maker-brand-composer.handler';
import { RevenueSignalComposerHandler } from './handlers/revenue-signal-composer.handler';
import { LinkedinActivityComposerHandler } from './handlers/linkedin-activity-composer.handler';
import { CompetitorMentionsComposerHandler } from './handlers/competitor-mentions-composer.handler';
import { HiringSignalsComposerHandler } from './handlers/hiring-signals-composer.handler';
import { TopicThemesComposerHandler } from './handlers/topic-themes-composer.handler';
import { ToneSignalsComposerHandler } from './handlers/tone-signals-composer.handler';
import { ColleagueNetworkComposerHandler } from './handlers/colleague-network-composer.handler';
import { ExternalSocialsComposerHandler } from './handlers/external-socials-composer.handler';
import { EventAttendanceComposerHandler } from './handlers/event-attendance-composer.handler';
import { LowQualityEngagementComposerHandler } from './handlers/low-quality-engagement-composer.handler';
import { DesignHelpSignalsComposerHandler } from './handlers/design-help-signals-composer.handler';
import { FinalSummaryComposerHandler } from './handlers/final-summary-composer.handler';
import { LinkedinProfileConnectorHandler } from '../../connectors/linkedin/handlers/linkedin-profile-connector.handler';
import { LinkedinPostsConnectorHandler } from '../../connectors/linkedin/handlers/linkedin-posts-connector.handler';
import { LinkedinCoreIdentityEnricherHandler } from '../../enrichers/linkedin-core-identity/handlers/linkedin-core-identity-enricher.handler';
import { LinkedinDigitalIdentityEnricherHandler } from '../../enrichers/linkedin-digital-identity/handlers/linkedin-digital-identity-enricher.handler';
import { LinkedinPostsNormalizerHandler } from '../../enrichers/linkedin-posts-normalizer/handlers/linkedin-posts-normalizer.handler';
import { ContentChunkerHandler } from '../../enrichers/content-chunker/handlers/content-chunker.handler';
import { LinkedinPostsChunkEvidenceExtractorHandler } from '../../enrichers/linkedin-posts-chunk-evidence-extractor/handlers/linkedin-posts-chunk-evidence-extractor.handler';
import { PersonalityActiveTimesReducerHandler } from '../../enrichers/personality-active-times-reducer/handlers/personality-active-times-reducer.handler';
import { ProspectSearchConnectorHandler } from '../../connectors/prospect/handlers/prospect-search-connector.handler';
import { LinkedinProfileWizaEnrichedConnectorHandler } from '../../connectors/wiza/handlers/linkedin-profile-wiza-enriched-connector.handler';
import {
  LINKEDIN_PROFILE_CONNECTOR_KEY,
  LINKEDIN_POSTS_CONNECTOR_KEY,
} from '../../common/constants/linkedin.constants';
import { MODULE_KEYS } from '../../common/constants/module-keys.constants';
import { ResultWithError } from '../../common/interfaces';

@Injectable()
export class ModuleDispatcherService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private moduleRepoService: ModuleRepoService,
    private noopModuleHandler: NoopModuleHandler,
    private manualDocumentConnectorHandler: ManualDocumentConnectorHandler,
    private coreIdentityEnricherHandler: CoreIdentityEnricherHandler,
    private layer1ComposerHandler: Layer1ComposerHandler,
    private decisionMakerBrandComposerHandler: DecisionMakerBrandComposerHandler,
    private revenueSignalComposerHandler: RevenueSignalComposerHandler,
    private linkedinActivityComposerHandler: LinkedinActivityComposerHandler,
    private competitorMentionsComposerHandler: CompetitorMentionsComposerHandler,
    private hiringSignalsComposerHandler: HiringSignalsComposerHandler,
    private topicThemesComposerHandler: TopicThemesComposerHandler,
    private toneSignalsComposerHandler: ToneSignalsComposerHandler,
    private colleagueNetworkComposerHandler: ColleagueNetworkComposerHandler,
    private externalSocialsComposerHandler: ExternalSocialsComposerHandler,
    private eventAttendanceComposerHandler: EventAttendanceComposerHandler,
    private lowQualityEngagementComposerHandler: LowQualityEngagementComposerHandler,
    private designHelpSignalsComposerHandler: DesignHelpSignalsComposerHandler,
    private finalSummaryComposerHandler: FinalSummaryComposerHandler,
    private linkedinProfileConnectorHandler: LinkedinProfileConnectorHandler,
    private linkedinPostsConnectorHandler: LinkedinPostsConnectorHandler,
    private linkedinCoreIdentityEnricherHandler: LinkedinCoreIdentityEnricherHandler,
    private linkedinDigitalIdentityEnricherHandler: LinkedinDigitalIdentityEnricherHandler,
    private linkedinPostsNormalizerHandler: LinkedinPostsNormalizerHandler,
    private contentChunkerHandler: ContentChunkerHandler,
    private linkedinPostsChunkEvidenceExtractorHandler: LinkedinPostsChunkEvidenceExtractorHandler,
    private personalityActiveTimesReducerHandler: PersonalityActiveTimesReducerHandler,
    private prospectSearchConnectorHandler: ProspectSearchConnectorHandler,
    private linkedinProfileWizaEnrichedConnectorHandler: LinkedinProfileWizaEnrichedConnectorHandler,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      // Load module to determine scope
      const module = await Promisify<Module | null>(
        this.moduleRepoService.get(
          {
            where: {
              ModuleKey: run.ModuleKey,
              Version: run.ModuleVersion,
            },
          },
          false,
        ),
      );

      const scope = module?.Scope || ModuleScope.PERSON_LEVEL;
      const scopeLabel =
        scope === ModuleScope.PROJECT_LEVEL ? 'PROJECT_LEVEL' : 'PERSON_LEVEL';

      this.logger.info(
        `ModuleDispatcherService.execute: Dispatching ${scopeLabel} run for module ${
          run.ModuleKey
        } [moduleRunId=${run.ModuleRunID}, moduleKey=${
          run.ModuleKey
        }, personId=${run.PersonID || 'null'}]`,
      );

      // Dispatch based on module key
      switch (run.ModuleKey) {
        case 'noop':
          return await this.noopModuleHandler.execute(run);
        case 'manual-document-connector':
          return await this.manualDocumentConnectorHandler.execute(run);
        case 'core-identity-enricher':
          return await this.coreIdentityEnricherHandler.execute(run);
        case 'layer-1-composer':
          return await this.layer1ComposerHandler.execute(run);
        case MODULE_KEYS.DECISION_MAKER_BRAND_COMPOSER:
          return await this.decisionMakerBrandComposerHandler.execute(run);
        case MODULE_KEYS.REVENUE_SIGNAL_COMPOSER:
          return await this.revenueSignalComposerHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_ACTIVITY_COMPOSER:
          return await this.linkedinActivityComposerHandler.execute(run);
        case MODULE_KEYS.COMPETITOR_MENTIONS_COMPOSER:
          return await this.competitorMentionsComposerHandler.execute(run);
        case MODULE_KEYS.HIRING_SIGNALS_COMPOSER:
          return await this.hiringSignalsComposerHandler.execute(run);
        case MODULE_KEYS.TOPIC_THEMES_COMPOSER:
          return await this.topicThemesComposerHandler.execute(run);
        case MODULE_KEYS.TONE_SIGNALS_COMPOSER:
          return await this.toneSignalsComposerHandler.execute(run);
        case MODULE_KEYS.COLLEAGUE_NETWORK_COMPOSER:
          return await this.colleagueNetworkComposerHandler.execute(run);
        case MODULE_KEYS.EXTERNAL_SOCIALS_COMPOSER:
          return await this.externalSocialsComposerHandler.execute(run);
        case MODULE_KEYS.EVENT_ATTENDANCE_COMPOSER:
          return await this.eventAttendanceComposerHandler.execute(run);
        case MODULE_KEYS.LOW_QUALITY_ENGAGEMENT_COMPOSER:
          return await this.lowQualityEngagementComposerHandler.execute(run);
        case MODULE_KEYS.DESIGN_HELP_SIGNALS_COMPOSER:
          return await this.designHelpSignalsComposerHandler.execute(run);
        case MODULE_KEYS.FINAL_SUMMARY_COMPOSER:
          return await this.finalSummaryComposerHandler.execute(run);
        case LINKEDIN_PROFILE_CONNECTOR_KEY:
          return await this.linkedinProfileConnectorHandler.execute(run);
        case LINKEDIN_POSTS_CONNECTOR_KEY:
          return await this.linkedinPostsConnectorHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_CORE_IDENTITY_ENRICHER:
          return await this.linkedinCoreIdentityEnricherHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_DIGITAL_IDENTITY_ENRICHER:
          return await this.linkedinDigitalIdentityEnricherHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_POSTS_NORMALIZER:
          return await this.linkedinPostsNormalizerHandler.execute(run);
        case MODULE_KEYS.CONTENT_CHUNKER:
          return await this.contentChunkerHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_POSTS_CHUNK_EVIDENCE_EXTRACTOR:
          return await this.linkedinPostsChunkEvidenceExtractorHandler.execute(
            run,
          );
        case MODULE_KEYS.PERSONALITY_ACTIVE_TIMES_REDUCER:
          return await this.personalityActiveTimesReducerHandler.execute(run);
        case MODULE_KEYS.PROSPECT_SEARCH_CONNECTOR:
          return await this.prospectSearchConnectorHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_PROFILE_WIZA_ENRICHED_CONNECTOR:
          return await this.linkedinProfileWizaEnrichedConnectorHandler.execute(
            run,
          );
        default:
          throw new Error(
            `No handler registered for module key: ${run.ModuleKey}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `ModuleDispatcherService.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}]`,
      );
      return { error: error, data: null };
    }
  }
}

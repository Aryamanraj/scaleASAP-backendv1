import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../repo/entities/module-run.entity';
import { NoopModuleHandler } from './handlers/noop-module.handler';
import { ManualDocumentConnectorHandler } from './handlers/manual-document-connector.handler';
import { CoreIdentityEnricherHandler } from './handlers/core-identity-enricher.handler';
import { Layer1ComposerHandler } from './handlers/layer-1-composer.handler';
import { LinkedinProfileConnectorHandler } from '../../connectors/linkedin/handlers/linkedin-profile-connector.handler';
import { LinkedinPostsConnectorHandler } from '../../connectors/linkedin/handlers/linkedin-posts-connector.handler';
import { LinkedinCoreIdentityEnricherHandler } from '../../enrichers/linkedin-core-identity/handlers/linkedin-core-identity-enricher.handler';
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
    private noopModuleHandler: NoopModuleHandler,
    private manualDocumentConnectorHandler: ManualDocumentConnectorHandler,
    private coreIdentityEnricherHandler: CoreIdentityEnricherHandler,
    private layer1ComposerHandler: Layer1ComposerHandler,
    private linkedinProfileConnectorHandler: LinkedinProfileConnectorHandler,
    private linkedinPostsConnectorHandler: LinkedinPostsConnectorHandler,
    private linkedinCoreIdentityEnricherHandler: LinkedinCoreIdentityEnricherHandler,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ModuleDispatcherService.execute: Dispatching run for module ${run.ModuleKey} [moduleRunId=${run.ModuleRunID}, moduleKey=${run.ModuleKey}]`,
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
        case LINKEDIN_PROFILE_CONNECTOR_KEY:
          return await this.linkedinProfileConnectorHandler.execute(run);
        case LINKEDIN_POSTS_CONNECTOR_KEY:
          return await this.linkedinPostsConnectorHandler.execute(run);
        case MODULE_KEYS.LINKEDIN_CORE_IDENTITY_ENRICHER:
          return await this.linkedinCoreIdentityEnricherHandler.execute(run);
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

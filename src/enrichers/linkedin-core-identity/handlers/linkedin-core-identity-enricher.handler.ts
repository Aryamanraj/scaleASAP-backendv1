import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { LinkedinCoreIdentityEnricherService } from '../services/linkedin-core-identity-enricher.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class LinkedinCoreIdentityEnricherHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private enricherService: LinkedinCoreIdentityEnricherService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinCoreIdentityEnricherHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const result = await Promisify(this.enricherService.enrich(run));

      this.logger.info(
        `LinkedinCoreIdentityEnricherHandler.execute: Successfully completed [moduleRunId=${run.ModuleRunID}]`,
      );

      return { error: null, data: result };
    } catch (error) {
      this.logger.error(
        `LinkedinCoreIdentityEnricherHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

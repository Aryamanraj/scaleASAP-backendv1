/**
 * LinkedIn Digital Identity Enricher Handler
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ResultWithError } from '../../../common/interfaces';
import { LinkedinDigitalIdentityEnricherService } from '../services/linkedin-digital-identity-enricher.service';

@Injectable()
export class LinkedinDigitalIdentityEnricherHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private enricherService: LinkedinDigitalIdentityEnricherService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    this.logger.info(
      `LinkedinDigitalIdentityEnricherHandler.execute: Starting [moduleRunId=${run.ModuleRunID}]`,
    );

    const result = await this.enricherService.enrich(run);

    this.logger.info(
      `LinkedinDigitalIdentityEnricherHandler.execute: Completed [moduleRunId=${
        run.ModuleRunID
      }, error=${!!result.error}]`,
    );

    return result;
  }
}

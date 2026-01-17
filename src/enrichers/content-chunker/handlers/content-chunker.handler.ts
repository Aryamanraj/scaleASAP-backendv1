import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ContentChunkerService } from '../services/content-chunker.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class ContentChunkerHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private chunkerService: ContentChunkerService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ContentChunkerHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const result = await Promisify(this.chunkerService.chunk(run));

      this.logger.info(
        `ContentChunkerHandler.execute: Successfully completed [moduleRunId=${run.ModuleRunID}]`,
      );

      return { error: null, data: result };
    } catch (error) {
      this.logger.error(
        `ContentChunkerHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

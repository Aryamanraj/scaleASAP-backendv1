import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { LinkedinPostsChunkEvidenceExtractorService } from '../services/linkedin-posts-chunk-evidence-extractor.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class LinkedinPostsChunkEvidenceExtractorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private extractorService: LinkedinPostsChunkEvidenceExtractorService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const result = await Promisify(this.extractorService.extract(run));

      this.logger.info(
        `LinkedinPostsChunkEvidenceExtractorHandler.execute: Successfully completed [moduleRunId=${run.ModuleRunID}]`,
      );

      return { error: null, data: result };
    } catch (error) {
      this.logger.error(
        `LinkedinPostsChunkEvidenceExtractorHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

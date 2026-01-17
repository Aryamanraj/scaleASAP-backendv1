import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { PersonalityActiveTimesReducerService } from '../services/personality-active-times-reducer.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class PersonalityActiveTimesReducerHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private reducerService: PersonalityActiveTimesReducerService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonalityActiveTimesReducerHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      const result = await Promisify(this.reducerService.reduce(run));

      this.logger.info(
        `PersonalityActiveTimesReducerHandler.execute: Successfully completed [moduleRunId=${run.ModuleRunID}]`,
      );

      return { error: null, data: result };
    } catch (error) {
      this.logger.error(
        `PersonalityActiveTimesReducerHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

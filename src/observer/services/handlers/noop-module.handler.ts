import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class NoopModuleHandler {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `NoopModuleHandler.execute: Processing noop module run [moduleRunId=${
          run.ModuleRunID
        }, inputConfigJson=${JSON.stringify(run.InputConfigJson)}]`,
      );

      // NOOP handler - does nothing, just logs and returns success
      this.logger.info(
        `NoopModuleHandler.execute: NOOP operation complete [moduleRunId=${run.ModuleRunID}]`,
      );

      return { error: null, data: { success: true } };
    } catch (error) {
      this.logger.error(
        `NoopModuleHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}]`,
      );
      return { error: error, data: null };
    }
  }
}

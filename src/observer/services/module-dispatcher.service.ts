import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../repo/entities/module-run.entity';
import { NoopModuleHandler } from './handlers/noop-module.handler';

@Injectable()
export class ModuleDispatcherService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private noopModuleHandler: NoopModuleHandler,
  ) {}

  async execute(run: ModuleRun): Promise<{ error: any; data: any }> {
    try {
      this.logger.info(
        `ModuleDispatcherService.execute: Dispatching run for module ${run.ModuleKey}`,
        { moduleRunId: run.ModuleRunID, moduleKey: run.ModuleKey },
      );

      // Dispatch based on module key
      switch (run.ModuleKey) {
        case 'noop':
          return await this.noopModuleHandler.execute(run);
        default:
          throw new Error(
            `No handler registered for module key: ${run.ModuleKey}`,
          );
      }
    } catch (error) {
      this.logger.error('ModuleDispatcherService.execute: Error', {
        error: error.message,
        moduleRunId: run.ModuleRunID,
      });
      return { error: error, data: null };
    }
  }
}

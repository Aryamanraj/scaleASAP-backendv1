import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import {
  ModulesController,
  ModuleRunsController,
  ModuleRunsProjectController,
} from './module-runner.controller';
import { ModuleRunnerService } from './module-runner.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { QueueNames } from '../common/constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueNames.MODULE_RUNS }),
    RepoModule,
    AuthModule,
  ],
  controllers: [
    ModulesController,
    ModuleRunsController,
    ModuleRunsProjectController,
  ],
  providers: [ModuleRunnerService],
  exports: [ModuleRunnerService],
})
export class ModuleRunnerModule {}

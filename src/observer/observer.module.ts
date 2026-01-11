import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { QueueNames } from '../common/constants';
import { RepoModule } from '../repo/repo.module';
import { LogConsumer } from './consumers/log.consumer';
import { LogObserverService } from './services/log-observer.service';
import { RpcModule } from '../rpc/rpc.module';
import { LateLogConsumer } from './consumers/late-log.consumer';
import { LateLogObserverService } from './services/late-log-observer.service';
import { ModuleRunConsumer } from './consumers/module-run.consumer';
import { ModuleDispatcherService } from './services/module-dispatcher.service';
import { NoopModuleHandler } from './services/handlers/noop-module.handler';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueNames.NEW_LOGS },
      { name: QueueNames.LATE_LOGS },
      { name: QueueNames.MODULE_RUNS },
    ),
    RepoModule,
    RpcModule,
  ],
  providers: [
    LogConsumer,
    LogObserverService,
    LateLogConsumer,
    LateLogObserverService,
    ModuleRunConsumer,
    ModuleDispatcherService,
    NoopModuleHandler,
  ],
  controllers: [],
})
export class ObserverModule {}

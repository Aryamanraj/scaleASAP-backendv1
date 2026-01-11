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
import { ManualDocumentConnectorHandler } from './services/handlers/manual-document-connector.handler';
import { CoreIdentityEnricherHandler } from './services/handlers/core-identity-enricher.handler';
import { Layer1ComposerHandler } from './services/handlers/layer-1-composer.handler';
import { DocumentReaderService } from './services/document-reader.service';
import { ClaimWriterService } from './services/claim-writer.service';
import { LayerSnapshotWriterService } from './services/layer-snapshot-writer.service';

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
    ManualDocumentConnectorHandler,
    CoreIdentityEnricherHandler,
    Layer1ComposerHandler,
    DocumentReaderService,
    ClaimWriterService,
    LayerSnapshotWriterService,
  ],
  controllers: [],
})
export class ObserverModule {}

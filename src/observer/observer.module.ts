import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
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
import { ApifyService } from './services/apify.service';
import { LinkedinDocumentWriterService } from './services/linkedin-document-writer.service';
import { LinkedinConnectorModule } from '../connectors/linkedin/linkedin.module';
import { DocumentsModule } from '../documents/documents.module';
import { LinkedinCoreIdentityModule } from '../enrichers/linkedin-core-identity/linkedin-core-identity.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueNames.NEW_LOGS },
      { name: QueueNames.LATE_LOGS },
      { name: QueueNames.MODULE_RUNS },
    ),
    HttpModule,
    RepoModule,
    RpcModule,
    LinkedinConnectorModule,
    DocumentsModule,
    LinkedinCoreIdentityModule,
    AIModule,
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
    ApifyService,
    LinkedinDocumentWriterService,
  ],
  controllers: [],
})
export class ObserverModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { ModuleRunnerModule } from '../module-runner/module-runner.module';
import { QueueNames } from '../common/constants';
import { IndexerJobController } from './indexer-job.controller';
import { IndexerJobService } from './indexer-job.service';
import { IndexerFlowBatchController } from './indexer-flow-batch.controller';
import { IndexerFlowBatchService } from './indexer-flow-batch.service';
import { IndexerFlowProcessorService } from './indexer-flow-processor.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueNames.INDEXER_FLOWS }),
    BullModule.registerQueue({ name: QueueNames.MODULE_RUNS }),
    RepoModule,
    AuthModule,
    ModuleRunnerModule,
  ],
  controllers: [IndexerJobController, IndexerFlowBatchController],
  providers: [
    IndexerJobService,
    IndexerFlowBatchService,
    IndexerFlowProcessorService,
  ],
})
export class IndexerJobModule {}

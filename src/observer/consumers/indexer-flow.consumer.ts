import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Job } from 'bull';
import { QueueNames, QUEUE_JOB_NAMES } from '../../common/constants';
import { Promisify } from '../../common/helpers/promisifier';
import { IndexerFlowProcessorService } from '../../indexer-job/indexer-flow-processor.service';

@Processor(QueueNames.INDEXER_FLOWS)
export class IndexerFlowConsumer {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private indexerFlowProcessorService: IndexerFlowProcessorService,
  ) {}

  @Process(QUEUE_JOB_NAMES.RUN_INDEXER_FLOW)
  async handleRunFlow(job: Job) {
    const { flowRunId } = job.data;

    try {
      this.logger.info(
        `IndexerFlowConsumer: Processing flow run [jobId=${job.id}, flowRunId=${flowRunId}]`,
      );
      job.progress(0);

      await Promisify(
        this.indexerFlowProcessorService.processFlowRun(flowRunId),
      );

      job.progress(100);
    } catch (error) {
      this.logger.error(
        `IndexerFlowConsumer: Error processing flow run [jobId=${job.id}, flowRunId=${flowRunId}]`,
        { error: error.message, stack: error.stack },
      );
    }
  }

  @OnQueueFailed()
  async handleFailedJobs(job: Job, err: Error) {
    this.logger.error(
      `IndexerFlowConsumer: Job failed [jobId=${job.id}, error=${err.message}]`,
    );
    if (job.attemptsMade < job.opts.attempts) {
      this.logger.info(`IndexerFlowConsumer: Retrying job [jobId=${job.id}]`);
      await job.retry();
    } else {
      this.logger.error(
        `IndexerFlowConsumer: Job has failed maximum number of times [jobId=${job.id}]`,
      );
    }
  }
}

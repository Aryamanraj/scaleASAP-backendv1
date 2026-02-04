import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Job } from 'bull';
import { QueueNames, QUEUE_JOB_NAMES } from '../../common/constants';
import { ModuleRunRepoService } from '../../repo/module-run-repo.service';
import { ModuleDispatcherService } from '../services/module-dispatcher.service';
import { Promisify } from '../../common/helpers/promisifier';
import { ModuleRun } from '../../repo/entities/module-run.entity';
import { ModuleRunStatus } from '../../common/constants/entity.constants';
import { IndexerFlowProcessorService } from '../../indexer-job/indexer-flow-processor.service';

@Processor(QueueNames.MODULE_RUNS)
export class ModuleRunConsumer {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private moduleRunRepoService: ModuleRunRepoService,
    private moduleDispatcherService: ModuleDispatcherService,
    private indexerFlowProcessorService: IndexerFlowProcessorService,
  ) {}

  @Process(QUEUE_JOB_NAMES.EXECUTE_MODULE_RUN)
  async handleExecuteModuleRun(job: Job) {
    const { moduleRunId } = job.data;

    try {
      this.logger.info(
        `ModuleRunConsumer: Processing module run [jobId: ${job.id}, moduleRunId: ${moduleRunId}]`,
      );
      job.progress(0);

      // Fetch module run
      const moduleRun = await Promisify<ModuleRun>(
        this.moduleRunRepoService.get(
          { where: { ModuleRunID: moduleRunId } },
          true,
        ),
      );

      // Update status to RUNNING
      await Promisify(
        this.moduleRunRepoService.update(
          { ModuleRunID: moduleRunId },
          {
            Status: ModuleRunStatus.RUNNING,
            StartedAt: new Date(),
          },
        ),
      );

      job.progress(30);

      // Execute module via dispatcher - uses Promisify to unwrap ResultWithError
      await Promisify(this.moduleDispatcherService.execute(moduleRun));

      job.progress(80);

      // Update status to COMPLETED
      await Promisify(
        this.moduleRunRepoService.update(
          { ModuleRunID: moduleRunId },
          {
            Status: ModuleRunStatus.COMPLETED,
            FinishedAt: new Date(),
          },
        ),
      );

      this.logger.info(
        `ModuleRunConsumer: Module run completed successfully [moduleRunId: ${moduleRunId}]`,
      );

      // Check if this module run belongs to a flow run and progress if needed
      const flowRunId = moduleRun.InputConfigJson?._flowRunId;
      if (flowRunId) {
        this.logger.info(
          `ModuleRunConsumer: Checking flow progress [flowRunId: ${flowRunId}]`,
        );
        await Promisify(
          this.indexerFlowProcessorService.checkAndProgressStage(flowRunId),
        );
      }

      job.progress(100);
    } catch (error) {
      this.logger.error(
        `ModuleRunConsumer: Error processing module run [jobId: ${job.id}, moduleRunId: ${moduleRunId}]`,
        { error: error.message, stack: error.stack },
      );

      // Attempt to update status to FAILED
      try {
        // Fetch moduleRun again to get InputConfigJson
        const failedModuleRun = await Promisify<ModuleRun>(
          this.moduleRunRepoService.get(
            { where: { ModuleRunID: moduleRunId } },
            false,
          ),
        );

        await Promisify(
          this.moduleRunRepoService.update(
            { ModuleRunID: moduleRunId },
            {
              Status: ModuleRunStatus.FAILED,
              FinishedAt: new Date(),
              ErrorJson: {
                message: error.message,
                stack: error.stack,
              },
            },
          ),
        );

        // Check if this module run belongs to a flow run and handle failure
        const flowRunId = failedModuleRun?.InputConfigJson?._flowRunId;
        if (flowRunId) {
          this.logger.info(
            `ModuleRunConsumer: Checking flow progress after failure [flowRunId: ${flowRunId}]`,
          );
          await Promisify(
            this.indexerFlowProcessorService.checkAndProgressStage(flowRunId),
          );
        }
      } catch (updateError) {
        this.logger.error(
          `ModuleRunConsumer: Failed to update module run status [moduleRunId: ${moduleRunId}]`,
          { error: updateError.message },
        );
      }
    }
  }

  @OnQueueFailed()
  async handleFailedJobs(job: Job, err: Error) {
    this.logger.error(
      `ModuleRunConsumer: Job failed [jobId: ${job.id}, error: ${err.message}]`,
    );
    if (job.attemptsMade < job.opts.attempts) {
      this.logger.info(`ModuleRunConsumer: Retrying job [jobId: ${job.id}]`);
      await job.retry();
    } else {
      this.logger.error(
        `ModuleRunConsumer: Job has failed maximum number of times [jobId: ${job.id}]`,
      );
    }
  }
}

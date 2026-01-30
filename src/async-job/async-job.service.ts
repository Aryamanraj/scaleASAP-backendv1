/**
 * Async Job Service
 * Redis-native job management using Bull queues.
 */

import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobStatus } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { QueueNames } from '../common/constants';
import { AsyncJobType } from '../common/constants/entity.constants';
import { ResultWithError } from '../common/interfaces';
import { AsyncJobResponseDto } from './dto/async-job-response.dto';
import { BaseJobData } from './interfaces/job-data.interface';

@Injectable()
export class AsyncJobService {
  private queues: Map<string, Queue> = new Map();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.DISCOVERY) private discoveryQueue: Queue,
    @InjectQueue(QueueNames.OUTREACH) private outreachQueue: Queue,
    @InjectQueue(QueueNames.LEAD_ENRICHMENT) private leadEnrichmentQueue: Queue,
    @InjectQueue(QueueNames.WEBSITE_SCRAPER) private websiteScraperQueue: Queue,
    @InjectQueue(QueueNames.CAMPAIGN_SCALE) private campaignScaleQueue: Queue,
    @InjectQueue(QueueNames.DATA_EXPORT) private dataExportQueue: Queue,
  ) {
    // Register queues for lookup by job type
    this.queues.set(AsyncJobType.DISCOVERY_CHAT, this.discoveryQueue);
    this.queues.set(AsyncJobType.GENERATE_EXPERIMENTS, this.discoveryQueue);
    this.queues.set(AsyncJobType.LEAD_ENRICHMENT, this.leadEnrichmentQueue);
    this.queues.set(
      AsyncJobType.BULK_LEAD_ENRICHMENT,
      this.leadEnrichmentQueue,
    );
    this.queues.set(AsyncJobType.GENERATE_OUTREACH, this.outreachQueue);
    this.queues.set(AsyncJobType.BULK_GENERATE_OUTREACH, this.outreachQueue);
    this.queues.set(AsyncJobType.WEBSITE_SCRAPE, this.websiteScraperQueue);
    this.queues.set(AsyncJobType.CAMPAIGN_SCALE, this.campaignScaleQueue);
    this.queues.set(AsyncJobType.WIZA_SEARCH, this.leadEnrichmentQueue);
    this.queues.set(AsyncJobType.DATA_EXPORT, this.dataExportQueue);
  }

  /**
   * Create a new async job.
   */
  async createJob<T extends BaseJobData>(
    jobType: AsyncJobType,
    data: T,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `AsyncJobService.createJob: Creating job [jobType=${jobType}, projectId=${data.projectId}]`,
      );

      const queue = this.queues.get(jobType);
      if (!queue) {
        return {
          data: null,
          error: new Error(`Unknown job type: ${jobType}`),
        };
      }

      const job = await queue.add(jobType, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      });

      this.logger.info(
        `AsyncJobService.createJob: Job created [jobId=${job.id}, jobType=${jobType}]`,
      );

      return {
        data: {
          jobId: job.id.toString(),
          jobType,
          status: 'queued',
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`AsyncJobService.createJob: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Get job status directly from Redis via Bull.
   */
  async getJobStatus(
    jobId: string,
    jobType: AsyncJobType,
  ): Promise<ResultWithError> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return {
          data: null,
          error: new Error(`Unknown job type: ${jobType}`),
        };
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { data: null, error: new Error(`Job not found: ${jobId}`) };
      }

      const state = await job.getState();
      const progress = job.progress();

      return {
        data: {
          jobId: job.id.toString(),
          jobType: job.data.jobType,
          status: this.mapBullStateToStatus(state),
          progress:
            typeof progress === 'number'
              ? progress
              : (progress as any)?.percentage || 0,
          totalSteps: job.data.totalSteps || 0,
          completedSteps: job.data.completedSteps || 0,
          currentStep: job.data.currentStep || this.getDefaultStepText(state),
          output: job.data.output || null,
          errorMessage:
            job.data.errorMessage ||
            (job.failedReason ? job.failedReason : null),
          createdAt: new Date(job.timestamp),
          startedAt: job.processedOn ? new Date(job.processedOn) : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`AsyncJobService.getJobStatus: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Get all jobs for a project (searches across all queues).
   */
  async getJobsForProject(
    projectId: number,
    status?: string,
  ): Promise<ResultWithError> {
    try {
      const allJobs: any[] = [];

      // Get unique queues (some job types share queues)
      const uniqueQueues = new Set(this.queues.values());

      for (const queue of uniqueQueues) {
        // Get jobs by status (Bull stores them separately)
        const states: JobStatus[] = status
          ? [this.mapStatusToBullState(status)]
          : ['waiting', 'active', 'completed', 'failed', 'delayed'];

        for (const state of states) {
          const jobs = await queue.getJobs([state], 0, 50);

          // Filter by projectId (stored in job.data)
          const projectJobs = jobs.filter(
            (j) => j.data.projectId === projectId,
          );

          for (const job of projectJobs) {
            const jobState = await job.getState();
            allJobs.push({
              jobId: job.id.toString(),
              jobType: job.data.jobType,
              status: this.mapBullStateToStatus(jobState),
              progress: job.progress(),
              currentStep: job.data.currentStep,
              createdAt: new Date(job.timestamp),
            });
          }
        }
      }

      // Sort by createdAt descending
      allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return { data: allJobs.slice(0, 50), error: null };
    } catch (error) {
      this.logger.error(
        `AsyncJobService.getJobsForProject: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Cancel a job if still in cancellable state.
   */
  async cancelJob(
    jobId: string,
    jobType: AsyncJobType,
  ): Promise<ResultWithError> {
    try {
      const queue = this.queues.get(jobType);
      if (!queue) {
        return {
          data: null,
          error: new Error(`Unknown job type: ${jobType}`),
        };
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return { data: null, error: new Error(`Job not found: ${jobId}`) };
      }

      const state = await job.getState();
      if (state === 'completed' || state === 'failed') {
        return {
          data: false,
          error: new Error('Cannot cancel completed/failed job'),
        };
      }

      await job.remove();
      this.logger.info(
        `AsyncJobService.cancelJob: Job cancelled [jobId=${jobId}]`,
      );

      return { data: true, error: null };
    } catch (error) {
      this.logger.error(`AsyncJobService.cancelJob: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Convert job data to response DTO.
   */
  toResponseDto(jobData: any): AsyncJobResponseDto {
    const elapsedSeconds = jobData.startedAt
      ? (Date.now() - new Date(jobData.startedAt).getTime()) / 1000
      : 0;

    // Estimate remaining time based on progress rate
    let estimatedSecondsRemaining: number | null = null;
    if (jobData.progress > 0 && jobData.progress < 100 && elapsedSeconds > 0) {
      const secondsPerPercent = elapsedSeconds / jobData.progress;
      estimatedSecondsRemaining = Math.round(
        secondsPerPercent * (100 - jobData.progress),
      );
    }

    return {
      jobId: jobData.jobId,
      jobType: jobData.jobType,
      status: jobData.status,
      progress: jobData.progress,
      progressText: `${jobData.progress}% complete`,
      completedSteps: jobData.completedSteps,
      totalSteps: jobData.totalSteps,
      currentStep: jobData.currentStep,
      estimatedSecondsRemaining,
      output: jobData.output,
      errorMessage: jobData.errorMessage,
      createdAt: jobData.createdAt,
      startedAt: jobData.startedAt,
      completedAt: jobData.completedAt,
    };
  }

  /**
   * Map Bull job state to our status string.
   */
  private mapBullStateToStatus(state: string): string {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Map our status string to Bull job state.
   */
  private mapStatusToBullState(status: string): JobStatus {
    switch (status) {
      case 'queued':
      case 'pending':
        return 'waiting';
      case 'processing':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'waiting';
    }
  }

  /**
   * Get default step text based on job state.
   */
  private getDefaultStepText(state: string): string {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'Queued for processing...';
      case 'active':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Waiting to start...';
    }
  }
}

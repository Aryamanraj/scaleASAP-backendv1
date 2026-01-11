import { Inject, Injectable } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { CronJob } from 'cron';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CRON_JOB_NAMES, QueueNames } from '../common/constants';

@Injectable()
export class ScheduleService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.NEW_LOGS) private newLogsQueue: Queue,
    @InjectQueue(QueueNames.LATE_LOGS) private lateLogsQueue: Queue,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async startCronsHealthChecker(
    cronTime: CronExpression = CronExpression.EVERY_10_MINUTES,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `[CronsHealth] Starting crons health checker : ${JSON.stringify(
          cronTime,
        )}`,
      );

      let job = undefined;
      try {
        job = this.schedulerRegistry.getCronJob(
          CRON_JOB_NAMES.CRONS_HEALTH_CHECKER,
        );
      } catch (error) {
        this.logger.info(
          `[CronsHealth] No cron job present [jobName : ${CRON_JOB_NAMES.CRONS_HEALTH_CHECKER}]`,
        );
      }

      if (job) {
        this.logger.info(`[CronsHealth] Found old job, removing it`);
        job.stop();
        this.schedulerRegistry.deleteCronJob(
          CRON_JOB_NAMES.CRONS_HEALTH_CHECKER,
        );
      }

      job = new CronJob(cronTime, async () => {
        await this.handleCronsHealthCheck();
      });
      this.schedulerRegistry.addCronJob(
        CRON_JOB_NAMES.CRONS_HEALTH_CHECKER,
        job,
      );

      job.start();
      this.logger.info(`[CronsHealth] added and started crons health checker`);
      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `[CronsHealth] Error in starting crons health checker : ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async stopCronsHealthChecker() {
    try {
      this.logger.info(`[CronsHealth] Stopping crons health checker`);

      const job = this.schedulerRegistry.getCronJob(
        CRON_JOB_NAMES.CRONS_HEALTH_CHECKER,
      );

      if (!job) {
        this.logger.info(
          `[CronsHealth] crons health checker job does not exist`,
        );
        return { data: { success: true }, error: null };
      }

      job.stop();
      this.logger.info(`[CronsHealth] stopped crons health checker job`);
      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `[CronsHealth] Error in stopping crons health checker : ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private async handleCronsHealthCheck() {
    try {
      this.logger.info(
        '[CronsHealth] Processing health checks for crons just started',
      );

      for (const [, cronName] of Object.entries(CRON_JOB_NAMES)) {
        try {
          const job = this.schedulerRegistry.getCronJob(cronName);
          const next: Date | string = job.nextDate().toJSDate();
          const lastRun: Date | string = job.lastDate()
            ? job.lastDate().toDateString()
            : 'Never';
          const status: string = job.running === true ? 'up' : 'down';

          this.logger.info(
            `Job: ${cronName} -> Status: ${status}, Next: ${next}, Last Run: ${lastRun}`,
          );
        } catch (error) {
          // If the job does not exist, log it as 'down'
          this.logger.info(
            `Job: ${cronName} -> Status: down, Next: NA, Last Run: NA`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[CronsHealth] Error in checking crons health: ${error.stack}`,
      );
    }
  }
}

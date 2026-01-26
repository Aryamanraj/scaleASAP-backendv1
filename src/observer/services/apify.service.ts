import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';
import {
  APIFY_POLL_INTERVAL_MS,
  APIFY_POLL_TIMEOUT_MS,
  ApifyRunStatus,
} from '../../common/constants/apify.constants';
import {
  ApifyActorRun,
  ApifyDatasetItem,
} from '../../common/interfaces/apify.interfaces';

@Injectable()
export class ApifyService {
  private readonly apifyToken: string;
  private readonly baseUrl = 'https://api.apify.com/v2';

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.apifyToken = this.configService.get<string>('APIFY_TOKEN');
    if (!this.apifyToken) {
      this.logger.warn(
        'ApifyService: APIFY_TOKEN not configured. Apify operations will fail.',
      );
    }
  }

  /**
   * Start an Apify actor run
   */
  async startActorRun(actorId: string, input: any): Promise<ResultWithError> {
    try {
      const encodedActorId = encodeURIComponent(actorId);
      this.logger.info(
        `ApifyService.startActorRun: Starting actor [actorId=${actorId}, encoded=${encodedActorId}]`,
      );

      if (!this.apifyToken) {
        throw new Error('APIFY_TOKEN not configured');
      }

      const url = `${this.baseUrl}/acts/${encodedActorId}/runs?token=${this.apifyToken}`;

      const response = await firstValueFrom(
        this.httpService.post(url, input, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const run = response.data.data as ApifyActorRun;

      this.logger.info(
        `ApifyService.startActorRun: Actor run started [runId=${run.id}, status=${run.status}]`,
      );

      return { error: null, data: run };
    } catch (error) {
      this.logger.error(
        `ApifyService.startActorRun: Error - ${error.message}`,
        { actorId, error: error.stack },
      );
      return { error: error, data: null };
    }
  }

  /**
   * Wait for an Apify actor run to complete
   */
  async waitForRun(actorId: string, runId: string): Promise<ResultWithError> {
    try {
      const encodedActorId = encodeURIComponent(actorId);
      this.logger.info(
        `ApifyService.waitForRun: Waiting for run ${runId} to complete`,
      );

      const startTime = Date.now();

      while (true) {
        // Check timeout
        if (Date.now() - startTime > APIFY_POLL_TIMEOUT_MS) {
          throw new Error(
            `Actor run timed out after ${APIFY_POLL_TIMEOUT_MS}ms`,
          );
        }

        // Get run status
        const url = `${this.baseUrl}/acts/${encodedActorId}/runs/${runId}?token=${this.apifyToken}`;
        const response = await firstValueFrom(this.httpService.get(url));
        const run = response.data.data as ApifyActorRun;

        this.logger.info(
          `ApifyService.waitForRun: Run status=${run.status} [runId=${runId}]`,
        );

        // Check if completed
        if (run.status === ApifyRunStatus.SUCCEEDED) {
          this.logger.info(
            `ApifyService.waitForRun: Run succeeded [runId=${runId}]`,
          );
          return { error: null, data: run };
        }

        if (
          run.status === ApifyRunStatus.FAILED ||
          run.status === ApifyRunStatus.ABORTED ||
          run.status === ApifyRunStatus.TIMED_OUT
        ) {
          // Fetch run log tail for better error debugging
          let logTail = '';
          try {
            const logUrl = `${this.baseUrl}/actor-runs/${runId}/log?token=${this.apifyToken}`;
            const logResponse = await firstValueFrom(
              this.httpService.get(logUrl, {
                headers: { Accept: 'text/plain' },
              }),
            );
            const fullLog = logResponse.data || '';
            // Truncate to last 4000 chars for error message
            logTail =
              fullLog.length > 4000 ? '...' + fullLog.slice(-4000) : fullLog;
          } catch (logError) {
            this.logger.warn(
              `ApifyService.waitForRun: Could not fetch run log - ${logError.message}`,
            );
            logTail = '(log fetch failed)';
          }

          throw new Error(
            `Actor run failed with status: ${run.status}. Log tail: ${logTail}`,
          );
        }

        // Wait before next poll
        await this.sleep(APIFY_POLL_INTERVAL_MS);
      }
    } catch (error) {
      this.logger.error(
        `ApifyService.waitForRun: Error - ${error.message} [actorId=${actorId}, runId=${runId}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Fetch items from an Apify dataset
   */
  async fetchDatasetItems(
    datasetId: string,
    limit?: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ApifyService.fetchDatasetItems: Fetching items from dataset ${datasetId}`,
      );

      const url = `${this.baseUrl}/datasets/${datasetId}/items?token=${
        this.apifyToken
      }&format=json${limit ? `&limit=${limit}` : ''}`;

      const response = await firstValueFrom(this.httpService.get(url));
      const items = response.data as ApifyDatasetItem[];

      this.logger.info(
        `ApifyService.fetchDatasetItems: Fetched ${items.length} items from dataset ${datasetId}`,
      );

      return { error: null, data: items };
    } catch (error) {
      this.logger.error(
        `ApifyService.fetchDatasetItems: Error - ${error.message}`,
        { datasetId, error: error.stack },
      );
      return { error: error, data: null };
    }
  }

  /**
   * Run an actor and fetch dataset items in one operation
   */
  async runActorAndFetchDataset(
    actorId: string,
    input: any,
    limit?: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ApifyService.runActorAndFetchDataset: Running actor ${actorId}`,
      );

      // Start the run - use Promisify to propagate errors via exceptions
      const run = await Promisify<ApifyActorRun>(
        this.startActorRun(actorId, input),
      );

      // Wait for completion
      const completedRun = await Promisify<ApifyActorRun>(
        this.waitForRun(actorId, run.id),
      );

      // Fetch dataset items
      const items = await Promisify<ApifyDatasetItem[]>(
        this.fetchDatasetItems(completedRun.defaultDatasetId, limit),
      );

      this.logger.info(
        `ApifyService.runActorAndFetchDataset: Successfully completed [runId=${completedRun.id}, items=${items.length}]`,
      );

      return {
        error: null,
        data: {
          run: completedRun,
          items: items,
        },
      };
    } catch (error) {
      this.logger.error(
        `ApifyService.runActorAndFetchDataset: Error - ${error.message}`,
        { actorId, error: error.stack },
      );
      return { error: error, data: null };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

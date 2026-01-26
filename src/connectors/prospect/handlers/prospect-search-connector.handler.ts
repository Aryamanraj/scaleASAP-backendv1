import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ProspectSearchConnectorService } from '../services/prospect-search-connector.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { ResultWithError } from '../../../common/interfaces';

@Injectable()
export class ProspectSearchConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prospectSearchConnectorService: ProspectSearchConnectorService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ProspectSearchConnectorHandler.execute: Processing PROJECT_LEVEL module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}]`,
      );

      // Validate InputConfigJson exists
      if (!run?.InputConfigJson) {
        throw new Error(
          'Missing InputConfigJson for prospect-search-connector',
        );
      }

      // Call service with Promisify
      const result = await Promisify<{
        documentId: number;
        itemsRetrieved: number;
        pagesFetched: number;
        invalidatedCount: number;
        queryId: string;
      }>(this.prospectSearchConnectorService.execute(run));

      this.logger.info(
        `ProspectSearchConnectorHandler.execute: Successfully completed [documentId=${result.documentId}, itemsRetrieved=${result.itemsRetrieved}, pagesFetched=${result.pagesFetched}]`,
      );

      return { error: null, data: result };
    } catch (error) {
      this.logger.error(
        `ProspectSearchConnectorHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

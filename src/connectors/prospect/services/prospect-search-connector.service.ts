import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { DocumentRepoService } from '../../../repo/document-repo.service';
import { ScraperService } from '../../../scraper/scraper.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { sha256Hex } from '../../../common/helpers/sha256';
import { ResultWithError } from '../../../common/interfaces';
import { ProspectSearchConnectorInput } from '../../../common/interfaces/prospect-search-connector.interface';
import {
  DocumentSource,
  DocumentKind,
} from '../../../common/types/document.types';
import {
  SearchResponse,
  SearchItem,
} from '../../../common/interfaces/scraper.interfaces';
import { SCRAPER_PROVIDER } from '../../../common/types/scraper.types';
import { Document } from '../../../repo/entities/document.entity';
import {
  ProspectPersonUpsertService,
  ProspectProcessingSummary,
} from './prospect-person-upsert.service';

@Injectable()
export class ProspectSearchConnectorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private scraperService: ScraperService,
    private documentRepoService: DocumentRepoService,
    private prospectPersonUpsertService: ProspectPersonUpsertService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ProspectSearchConnectorService.execute: Starting PROJECT_LEVEL execution [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}]`,
      );

      // Parse and validate input
      const input: ProspectSearchConnectorInput = run.InputConfigJson;

      if (!input.provider) {
        throw new Error('provider is required in InputConfigJson');
      }

      if (input.provider !== SCRAPER_PROVIDER.PROSPECT) {
        throw new Error(
          `Unsupported provider: ${input.provider}. Only PROSPECT is supported.`,
        );
      }

      if (!input.payload) {
        throw new Error('payload is required in InputConfigJson');
      }

      // Apply defaults
      const maxPages = input.maxPages ?? 10;
      const maxItems = input.maxItems ?? 500;
      const dedupeKey = input.dedupeKey ?? 'search';

      this.logger.info(
        `ProspectSearchConnectorService.execute: Calling ScraperService.search [provider=${input.provider}, maxPages=${maxPages}, maxItems=${maxItems}, enrichProfiles=true]`,
      );

      // Call ScraperService with Promisify - always enrich profiles for complete data
      const searchResult = await Promisify<SearchResponse>(
        this.scraperService.search({
          provider: input.provider,
          payload: input.payload,
          options: {
            maxPages,
            maxItems,
            enrichProfiles: input.isEnrichProfiles ?? true,
          },
        }),
      );

      this.logger.info(
        `ProspectSearchConnectorService.execute: Search completed [itemsRetrieved=${searchResult.items.length}, pagesFetched=${searchResult.pagesFetched}]`,
      );

      // Calculate hash for deduplication
      const hashInput = {
        provider: input.provider,
        payload: input.payload,
        pageCount: searchResult.pagesFetched,
        itemCount: searchResult.items.length,
        dedupeKey,
      };
      const hash = sha256Hex(JSON.stringify(hashInput));

      // Create Document (PROJECT_LEVEL: PersonID = null)
      const capturedAt = new Date();
      const documentData = {
        ProjectID: run.ProjectID,
        PersonID: null, // PROJECT_LEVEL module - no person
        Source: DocumentSource.PROSPECT,
        SourceRef: searchResult.queryId || null,
        ContentType: 'application/json',
        DocumentKind: DocumentKind.PROSPECT_SEARCH_RESULTS,
        IsValid: true,
        InvalidatedMetaJson: null,
        StorageUri: 'inline://document',
        Hash: hash,
        CapturedAt: capturedAt,
        ModuleRunID: run.ModuleRunID,
        PayloadJson: {
          provider: input.provider,
          input: {
            payload: input.payload,
            maxPages,
            maxItems,
            dedupeKey,
          },
          result: searchResult,
        },
      };

      const document = await Promisify<Document>(
        this.documentRepoService.create(documentData),
      );

      this.logger.info(
        `ProspectSearchConnectorService.execute: Document created [documentId=${document.DocumentID}, documentKind=${DocumentKind.PROSPECT_SEARCH_RESULTS}]`,
      );

      // Invalidate older valid documents for same Project+Source+DocumentKind (PersonID=null)
      const nowISOString = new Date().toISOString();
      const invalidatedMetaJson = {
        reason: 'superseded',
        supersededBy: document.DocumentID,
        moduleRunId: run.ModuleRunID,
        at: nowISOString,
      };

      const olderDocs = await Promisify<Document[]>(
        this.documentRepoService.getAll({
          where: {
            ProjectID: run.ProjectID,
            PersonID: null as any, // PROJECT_LEVEL documents have null PersonID
            Source: DocumentSource.PROSPECT,
            DocumentKind: DocumentKind.PROSPECT_SEARCH_RESULTS,
            IsValid: true,
          },
        }),
      );

      // Filter out the newly created document and invalidate others
      const docsToInvalidate = olderDocs.filter(
        (doc) => doc.DocumentID !== document.DocumentID,
      );

      this.logger.info(
        `ProspectSearchConnectorService.execute: Invalidating ${docsToInvalidate.length} older documents`,
      );

      for (const doc of docsToInvalidate) {
        await Promisify(
          this.documentRepoService.update(
            { DocumentID: doc.DocumentID },
            {
              IsValid: false,
              InvalidatedMetaJson: invalidatedMetaJson as any,
            },
          ),
        );
      }

      // =================================================================
      // PHASE 2: Process each item to populate tables
      // =================================================================
      this.logger.info(
        `ProspectSearchConnectorService.execute: Starting person/org/location processing [itemCount=${searchResult.items.length}]`,
      );

      // Determine triggeredByUserId - default to 1 (system) if not available
      const triggeredByUserId = run.TriggeredByUserID || 1;

      // Process all items and populate Persons, Organizations, Locations, PersonProjects
      const processingResult: ProspectProcessingSummary =
        await this.prospectPersonUpsertService.processAllItems(
          searchResult.items as SearchItem[],
          run.ProjectID,
          run.ModuleRunID,
          triggeredByUserId,
        );

      // Log failures if any
      if (processingResult.failures.length > 0) {
        this.logger.warn(
          `ProspectSearchConnectorService.execute: ${processingResult.failures.length} items failed processing`,
        );
        for (const failure of processingResult.failures.slice(0, 5)) {
          this.logger.warn(
            `ProspectSearchConnectorService.execute: Item failure [index=${failure.itemIndex}, linkedinUrl=${failure.linkedinUrl}, error=${failure.error}]`,
          );
        }
        if (processingResult.failures.length > 5) {
          this.logger.warn(
            `ProspectSearchConnectorService.execute: ... and ${
              processingResult.failures.length - 5
            } more failures`,
          );
        }
      }

      this.logger.info(
        `ProspectSearchConnectorService.execute: PROJECT_LEVEL execution completed successfully [documentId=${document.DocumentID}, itemsRetrieved=${searchResult.items.length}, invalidatedCount=${docsToInvalidate.length}, personsUpserted=${processingResult.personsUpserted}, orgsUpserted=${processingResult.organizationsUpserted}, locationsUpserted=${processingResult.locationsUpserted}, linksCreated=${processingResult.linksCreated}, snapshotsInserted=${processingResult.snapshotDocsInserted}, skippedNoUrl=${processingResult.itemsSkippedMissingLinkedinUrl}, failed=${processingResult.itemsFailedWithError}]`,
      );

      return {
        error: null,
        data: {
          documentId: document.DocumentID,
          itemsRetrieved: searchResult.items.length,
          pagesFetched: searchResult.pagesFetched,
          invalidatedCount: docsToInvalidate.length,
          queryId: searchResult.queryId,
          processing: {
            personsUpserted: processingResult.personsUpserted,
            organizationsUpserted: processingResult.organizationsUpserted,
            locationsUpserted: processingResult.locationsUpserted,
            linksCreated: processingResult.linksCreated,
            snapshotDocsInserted: processingResult.snapshotDocsInserted,
            itemsSkippedMissingLinkedinUrl:
              processingResult.itemsSkippedMissingLinkedinUrl,
            itemsFailedWithError: processingResult.itemsFailedWithError,
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `ProspectSearchConnectorService.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }
}

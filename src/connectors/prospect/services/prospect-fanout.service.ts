import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DocumentRepoService } from '../../../repo/document-repo.service';
import { PersonRepoService } from '../../../repo/person-repo.service';
import { PersonProjectRepoService } from '../../../repo/person-project-repo.service';
import { DiscoveryRunItemRepoService } from '../../../repo/discovery-run-item-repo.service';
import { Promisify } from '../../../common/helpers/promisifier';
import {
  normalizeLinkedinUrl,
  isLinkedinProfileUrl,
} from '../../../common/helpers/linkedinUrl';
import { sha256Hex } from '../../../common/helpers/sha256';
import { ResultWithError } from '../../../common/interfaces';
import {
  DocumentSource,
  DocumentKind,
} from '../../../common/types/document.types';
import {
  EntityStatus,
  DiscoveryRunItemStatus,
} from '../../../common/constants/entity.constants';
import { Document } from '../../../repo/entities/document.entity';
import { Person } from '../../../repo/entities/person.entity';
import { PersonProject } from '../../../repo/entities/person-project.entity';
import { DiscoveryRunItem } from '../../../repo/entities/discovery-run-item.entity';

/**
 * Input for a single prospect item to be processed
 */
export interface ProspectItem {
  linkedinUrl?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  [key: string]: any;
}

/**
 * Result of processing a single prospect item
 */
export interface FanoutItemResult {
  linkedinUrl: string;
  personId: number | null;
  documentId: number | null;
  discoveryRunItemId: number | null;
  status: 'CREATED' | 'FAILED';
  error?: string;
}

/**
 * ProspectFanoutService
 *
 * Processes prospect_search_results documents and creates:
 * - Person records (globally unique by LinkedIn URL)
 * - PersonProject associations (idempotent)
 * - Per-person Documents (prospect_person_snapshot)
 * - DiscoveryRunItems (for lineage tracking)
 */
@Injectable()
export class ProspectFanoutService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentRepoService: DocumentRepoService,
    private personRepoService: PersonRepoService,
    private personProjectRepoService: PersonProjectRepoService,
    private discoveryRunItemRepoService: DiscoveryRunItemRepoService,
  ) {}

  /**
   * Fan out prospect search results into Persons and per-person Documents.
   *
   * @param documentId - The ID of the prospect_search_results document to process
   * @param projectId - The project to associate persons with
   * @param triggeredByUserId - The user who triggered this operation
   * @param moduleRunId - The module run that produced the results
   */
  async fanoutProspectResults(
    documentId: number,
    projectId: number,
    triggeredByUserId: number,
    moduleRunId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ProspectFanoutService.fanoutProspectResults: Starting [documentId=${documentId}, projectId=${projectId}, moduleRunId=${moduleRunId}]`,
      );

      // Load the source document
      const sourceDoc = await Promisify<Document>(
        this.documentRepoService.get(
          { where: { DocumentID: documentId } },
          true,
        ),
      );

      if (sourceDoc.DocumentKind !== DocumentKind.PROSPECT_SEARCH_RESULTS) {
        throw new Error(
          `Document ${documentId} is not a prospect_search_results document. Got: ${sourceDoc.DocumentKind}`,
        );
      }

      // Parse items from PayloadJson
      const items: ProspectItem[] = sourceDoc.PayloadJson?.result?.items || [];

      this.logger.info(
        `ProspectFanoutService.fanoutProspectResults: Processing ${items.length} items`,
      );

      const results: FanoutItemResult[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Process each item individually (partial failures allowed)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const result = await this.processProspectItem(
          item,
          projectId,
          triggeredByUserId,
          moduleRunId,
          i,
        );
        results.push(result);

        if (result.status === 'CREATED') {
          successCount++;
        } else {
          failedCount++;
        }
      }

      this.logger.info(
        `ProspectFanoutService.fanoutProspectResults: Completed [documentId=${documentId}, total=${items.length}, success=${successCount}, failed=${failedCount}]`,
      );

      return {
        error: null,
        data: {
          sourceDocumentId: documentId,
          totalItems: items.length,
          successCount,
          failedCount,
          results,
        },
      };
    } catch (error) {
      this.logger.error(
        `ProspectFanoutService.fanoutProspectResults: Error [error=${error.message}, documentId=${documentId}]`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Process a single prospect item:
   * 1. Validate LinkedIn URL
   * 2. Get-or-create Person
   * 3. Ensure PersonProject association
   * 4. Create per-person Document
   * 5. Create DiscoveryRunItem
   */
  private async processProspectItem(
    item: ProspectItem,
    projectId: number,
    triggeredByUserId: number,
    moduleRunId: number,
    itemIndex: number,
  ): Promise<FanoutItemResult> {
    const linkedinUrl =
      item.linkedinUrl || item.linkedin_url || item.profile_url;

    // Validate LinkedIn URL exists and is valid
    if (!linkedinUrl) {
      this.logger.warn(
        `ProspectFanoutService.processProspectItem: No LinkedIn URL found [itemIndex=${itemIndex}]`,
      );
      return {
        linkedinUrl: '',
        personId: null,
        documentId: null,
        discoveryRunItemId: null,
        status: 'FAILED',
        error: 'No LinkedIn URL found in item',
      };
    }

    if (!isLinkedinProfileUrl(linkedinUrl)) {
      this.logger.warn(
        `ProspectFanoutService.processProspectItem: Invalid LinkedIn URL [itemIndex=${itemIndex}, url=${linkedinUrl}]`,
      );
      return {
        linkedinUrl,
        personId: null,
        documentId: null,
        discoveryRunItemId: null,
        status: 'FAILED',
        error: 'Invalid LinkedIn profile URL',
      };
    }

    try {
      const normalizedUrl = normalizeLinkedinUrl(linkedinUrl);

      // 1. Get-or-create Person (globally unique by LinkedIn URL)
      const displayName =
        item.fullName ||
        item.full_name ||
        (item.firstName && item.lastName
          ? `${item.firstName} ${item.lastName}`
          : item.firstName || item.lastName || null);

      let person = await Promisify<Person | null>(
        this.personRepoService.get(
          { where: { LinkedinUrl: normalizedUrl } },
          false,
        ),
      );

      if (!person) {
        person = await Promisify<Person>(
          this.personRepoService.create({
            LinkedinUrl: normalizedUrl,
            PrimaryDisplayName: displayName,
            Status: EntityStatus.ACTIVE,
            CreatedByUserID: triggeredByUserId,
          }),
        );
        this.logger.info(
          `ProspectFanoutService.processProspectItem: Created new Person [personId=${person.PersonID}, linkedinUrl=${normalizedUrl}]`,
        );
      }

      // 2. Ensure PersonProject association (idempotent)
      let personProject = await Promisify<PersonProject | null>(
        this.personProjectRepoService.get(
          {
            where: {
              ProjectID: projectId,
              PersonID: person.PersonID,
            },
          },
          false,
        ),
      );

      if (!personProject) {
        personProject = await Promisify<PersonProject>(
          this.personProjectRepoService.create({
            ProjectID: projectId,
            PersonID: person.PersonID,
            Tag: 'prospect-discovery',
            CreatedByUserID: triggeredByUserId,
          }),
        );
        this.logger.info(
          `ProspectFanoutService.processProspectItem: Created PersonProject [personProjectId=${personProject.PersonProjectID}, projectId=${projectId}, personId=${person.PersonID}]`,
        );
      }

      // 3. Create per-person Document
      const capturedAt = new Date();
      const sourceRef = item.id || item.prospect_id || item.external_id || null;
      const hash = sha256Hex(
        JSON.stringify({
          projectId,
          personId: person.PersonID,
          linkedinUrl: normalizedUrl,
          sourceRef,
          capturedAt: capturedAt.toISOString(),
        }),
      );

      const document = await Promisify<Document>(
        this.documentRepoService.create({
          ProjectID: projectId,
          PersonID: person.PersonID,
          Source: DocumentSource.PROSPECT,
          SourceRef: sourceRef,
          ContentType: 'application/json',
          DocumentKind: DocumentKind.PROSPECT_PERSON_SNAPSHOT,
          IsValid: true,
          InvalidatedMetaJson: null,
          StorageUri: 'inline://document',
          Hash: hash,
          CapturedAt: capturedAt,
          ModuleRunID: moduleRunId,
          PayloadJson: item,
        }),
      );

      this.logger.info(
        `ProspectFanoutService.processProspectItem: Created Document [documentId=${document.DocumentID}, personId=${person.PersonID}]`,
      );

      // 4. Create DiscoveryRunItem for lineage tracking
      const discoveryRunItem = await Promisify<DiscoveryRunItem>(
        this.discoveryRunItemRepoService.create({
          ModuleRunID: moduleRunId,
          ProjectID: projectId,
          PersonID: person.PersonID,
          SourceRef: sourceRef,
          CreatedDocumentID: document.DocumentID,
          Status: DiscoveryRunItemStatus.CREATED,
          ErrorJson: null,
        }),
      );

      return {
        linkedinUrl: normalizedUrl,
        personId: person.PersonID,
        documentId: document.DocumentID,
        discoveryRunItemId: discoveryRunItem.DiscoveryRunItemID,
        status: 'CREATED',
      };
    } catch (error) {
      this.logger.error(
        `ProspectFanoutService.processProspectItem: Error [error=${error.message}, itemIndex=${itemIndex}, linkedinUrl=${linkedinUrl}]`,
      );

      // Create failed DiscoveryRunItem for tracking
      try {
        const discoveryRunItem = await Promisify<DiscoveryRunItem>(
          this.discoveryRunItemRepoService.create({
            ModuleRunID: moduleRunId,
            ProjectID: projectId,
            PersonID: null,
            SourceRef: item.id || item.prospect_id || null,
            CreatedDocumentID: null,
            Status: DiscoveryRunItemStatus.FAILED,
            ErrorJson: { message: error.message, linkedinUrl },
          }),
        );

        return {
          linkedinUrl,
          personId: null,
          documentId: null,
          discoveryRunItemId: discoveryRunItem.DiscoveryRunItemID,
          status: 'FAILED',
          error: error.message,
        };
      } catch (trackingError) {
        // If we can't even create the tracking record, just return the error
        return {
          linkedinUrl,
          personId: null,
          documentId: null,
          discoveryRunItemId: null,
          status: 'FAILED',
          error: error.message,
        };
      }
    }
  }
}

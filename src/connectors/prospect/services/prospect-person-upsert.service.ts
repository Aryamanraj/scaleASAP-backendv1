import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../../../common/interfaces';
import { Promisify } from '../../../common/helpers/promisifier';
import {
  normalizeLinkedinUrl,
  extractLinkedinUsername,
  safeNormalizeLinkedinUrl,
} from '../../../common/helpers/linkedinUrl';
import {
  parseLocationFromProspect,
  parseCompanyLocationFromProspect,
  ParsedLocation,
} from '../../../common/helpers/location';
import {
  mapProspectCompany,
  MappedCompany,
} from '../../../common/helpers/company';
import { SearchItem } from '../../../common/interfaces/scraper.interfaces';
import { PersonRepoService } from '../../../repo/person-repo.service';
import { LocationRepoService } from '../../../repo/location-repo.service';
import { OrganizationRepoService } from '../../../repo/organization-repo.service';
import { PersonProjectRepoService } from '../../../repo/person-project-repo.service';
import { DocumentRepoService } from '../../../repo/document-repo.service';
import { Person } from '../../../repo/entities/person.entity';
import { Location } from '../../../repo/entities/location.entity';
import { Organization } from '../../../repo/entities/organization.entity';
import { PersonProject } from '../../../repo/entities/person-project.entity';
import { Document } from '../../../repo/entities/document.entity';
import {
  DocumentSource,
  DocumentKind,
} from '../../../common/types/document.types';
import { sha256Hex } from '../../../common/helpers/sha256';

/**
 * Truncates a string to the specified maximum length.
 * Returns null if input is null/undefined.
 *
 * @param value - String to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated string or null
 */
function truncateString(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (!value) return null;
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength);
}

/**
 * Result of processing a single prospect search item.
 */
export interface ProspectItemProcessResult {
  success: boolean;
  linkedinUrl: string | null;
  personId: number | null;
  organizationId: number | null;
  locationId: number | null;
  personProjectId: number | null;
  snapshotDocumentId: number | null;
  skippedReason: string | null;
  error: Error | null;
}

/**
 * Summary counts from processing all items.
 */
export interface ProspectProcessingSummary {
  itemsProcessed: number;
  personsUpserted: number;
  organizationsUpserted: number;
  locationsUpserted: number;
  linksCreated: number;
  snapshotDocsInserted: number;
  itemsSkippedMissingLinkedinUrl: number;
  itemsFailedWithError: number;
  failures: Array<{
    itemIndex: number;
    linkedinUrl: string | null;
    error: string;
  }>;
}

/**
 * ProspectPersonUpsertService
 *
 * Handles upserting Persons, Organizations, Locations, and PersonProjects
 * from prospect search response items. Also manages PROSPECT_PERSON_SNAPSHOT
 * document creation with proper invalidation of previous snapshots.
 */
@Injectable()
export class ProspectPersonUpsertService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private personRepoService: PersonRepoService,
    private locationRepoService: LocationRepoService,
    private organizationRepoService: OrganizationRepoService,
    private personProjectRepoService: PersonProjectRepoService,
    private documentRepoService: DocumentRepoService,
  ) {}

  /**
   * Upserts a location from parsed location data.
   * Uses NormalizedKey for deduplication.
   *
   * @param parsedLocation - Parsed location from parseLocationFromProspect
   * @returns ResultWithError containing the upserted Location
   */
  async upsertLocation(
    parsedLocation: ParsedLocation,
  ): Promise<ResultWithError> {
    try {
      if (
        !parsedLocation.normalizedKey ||
        parsedLocation.normalizedKey === 'unknown'
      ) {
        this.logger.info(
          `ProspectPersonUpsertService.upsertLocation: Skipping empty/unknown location`,
        );
        return { data: null, error: null };
      }

      this.logger.info(
        `ProspectPersonUpsertService.upsertLocation: Upserting [normalizedKey=${parsedLocation.normalizedKey}]`,
      );

      const locationData: Partial<Location> = {
        City: parsedLocation.city,
        Region: parsedLocation.region,
        Country: parsedLocation.country,
        CountryCode: parsedLocation.countryCode,
        DisplayName: parsedLocation.displayName,
        NormalizedKey: parsedLocation.normalizedKey,
      };

      const location = await Promisify<Location>(
        this.locationRepoService.upsert(locationData),
      );

      this.logger.info(
        `ProspectPersonUpsertService.upsertLocation: Success [LocationID=${location.LocationID}]`,
      );

      return { data: location, error: null };
    } catch (error) {
      this.logger.error(
        `ProspectPersonUpsertService.upsertLocation: Error [error=${error.message}, stack=${error.stack}]`,
      );
      return { data: null, error };
    }
  }

  /**
   * Upserts an organization from mapped company data.
   * Uses deduplication priority: LinkedinCompanyUrn > Domain > Name+LocationID.
   *
   * @param mappedCompany - Mapped company data from mapProspectCompany
   * @param companyLocation - Optional location for the company
   * @returns ResultWithError containing the upserted Organization
   */
  async upsertOrganization(
    mappedCompany: MappedCompany,
    companyLocation?: Location | null,
  ): Promise<ResultWithError> {
    try {
      if (!mappedCompany.name) {
        this.logger.info(
          `ProspectPersonUpsertService.upsertOrganization: Skipping - no company name`,
        );
        return { data: null, error: null };
      }

      this.logger.info(
        `ProspectPersonUpsertService.upsertOrganization: Upserting [name=${mappedCompany.name}, domain=${mappedCompany.domain}]`,
      );

      const orgData: Partial<Organization> = {
        Name: truncateString(mappedCompany.name, 512),
        NameNormalized: truncateString(
          mappedCompany.name.toLowerCase().trim(),
          512,
        ),
        Domain: truncateString(mappedCompany.domain, 255),
        Website: truncateString(mappedCompany.website, 512),
        Industry: truncateString(mappedCompany.industry, 255),
        SizeRange: mappedCompany.sizeRange,
        FoundedYear: mappedCompany.foundedYear,
        Type: mappedCompany.type,
        InferredRevenue: truncateString(mappedCompany.inferredRevenue, 128),
        TotalFundingRaised: truncateString(mappedCompany.totalFundingRaised, 128),
        LinkedinUrl: truncateString(mappedCompany.linkedinUrl, 512),
        LinkedinCompanyId: truncateString(mappedCompany.linkedinCompanyId, 64),
        LinkedinCompanyUrn: truncateString(mappedCompany.linkedinCompanyUrn, 128),
        LocationID: companyLocation?.LocationID || null,
      };

      const organization = await Promisify<Organization>(
        this.organizationRepoService.upsert(orgData),
      );

      this.logger.info(
        `ProspectPersonUpsertService.upsertOrganization: Success [OrganizationID=${organization.OrganizationID}]`,
      );

      return { data: organization, error: null };
    } catch (error) {
      this.logger.error(
        `ProspectPersonUpsertService.upsertOrganization: Error [error=${error.message}, stack=${error.stack}]`,
      );
      return { data: null, error };
    }
  }

  /**
   * Upserts a person from a prospect SearchItem.
   * LinkedinUrl is required - if missing, returns null (caller should skip).
   *
   * @param item - SearchItem from prospect search response
   * @param organization - Optional current employer organization
   * @param personLocation - Optional person location
   * @returns ResultWithError containing the upserted Person or null if no LinkedinUrl
   */
  async upsertPersonFromProspect(
    item: SearchItem,
    organization?: Organization | null,
    personLocation?: Location | null,
  ): Promise<ResultWithError> {
    try {
      // Try to get LinkedIn URL from multiple sources
      const rawLinkedinUrl =
        item.linkedin_url || item.enriched?.profile?.profile_id; // profile_id is sometimes the URL

      // Canonicalize LinkedIn URL
      const linkedinUrl = safeNormalizeLinkedinUrl(rawLinkedinUrl);

      if (!linkedinUrl) {
        this.logger.info(
          `ProspectPersonUpsertService.upsertPersonFromProspect: Skipping - no valid LinkedIn URL [rawUrl=${rawLinkedinUrl}]`,
        );
        return { data: null, error: null };
      }

      this.logger.info(
        `ProspectPersonUpsertService.upsertPersonFromProspect: Upserting [linkedinUrl=${linkedinUrl}]`,
      );

      // Extract slug
      let linkedinSlug: string | null = null;
      try {
        linkedinSlug = extractLinkedinUsername(linkedinUrl);
      } catch {
        linkedinSlug = item.linkedin_slug || null;
      }

      // Get profile data from enriched profile
      const profile = item.enriched?.profile;

      // Build display name
      const firstName = truncateString(profile?.first_name, 128);
      const lastName = truncateString(profile?.last_name, 128);
      const displayName = truncateString(
        item.full_name ||
          (firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null),
        255,
      );

      const personData: Partial<Person> = {
        LinkedinUrl: linkedinUrl,
        LinkedinSlug: truncateString(linkedinSlug || item.linkedin_slug, 128),
        ExternalUrn: truncateString(profile?.entity_urn, 128),
        FirstName: firstName,
        LastName: lastName,
        PrimaryDisplayName: displayName,
        Headline: truncateString(profile?.summary || item.job_title, 512),
        SubTitle: truncateString(profile?.sub_title, 512),
        CurrentOrganizationID: organization?.OrganizationID || null,
        LocationID: personLocation?.LocationID || null,
      };

      const person = await Promisify<Person>(
        this.personRepoService.upsert(personData),
      );

      this.logger.info(
        `ProspectPersonUpsertService.upsertPersonFromProspect: Success [PersonID=${person.PersonID}, LinkedinUrl=${linkedinUrl}]`,
      );

      return { data: person, error: null };
    } catch (error) {
      this.logger.error(
        `ProspectPersonUpsertService.upsertPersonFromProspect: Error [error=${error.message}, stack=${error.stack}]`,
      );
      return { data: null, error };
    }
  }

  /**
   * Ensures a PersonProject link exists for the given person and project.
   * If already exists, returns existing record (idempotent).
   *
   * @param projectId - Project ID to link
   * @param personId - Person ID to link
   * @param createdByUserId - User who created this link
   * @returns ResultWithError containing the PersonProject
   */
  async ensurePersonProject(
    projectId: number,
    personId: number,
    createdByUserId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ProspectPersonUpsertService.ensurePersonProject: Ensuring link [projectId=${projectId}, personId=${personId}]`,
      );

      // Check if link already exists
      const existing = await this.personProjectRepoService.get(
        {
          where: { ProjectID: projectId, PersonID: personId },
        },
        false, // don't panic if not found
      );

      if (existing.data) {
        this.logger.info(
          `ProspectPersonUpsertService.ensurePersonProject: Link already exists [PersonProjectID=${existing.data.PersonProjectID}]`,
        );
        return { data: existing.data, error: null };
      }

      // Create new link
      const personProject = await Promisify<PersonProject>(
        this.personProjectRepoService.create({
          ProjectID: projectId,
          PersonID: personId,
          CreatedByUserID: createdByUserId,
          Tag: 'prospect_search',
        }),
      );

      this.logger.info(
        `ProspectPersonUpsertService.ensurePersonProject: Created link [PersonProjectID=${personProject.PersonProjectID}]`,
      );

      return { data: personProject, error: null };
    } catch (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        // PostgreSQL unique violation
        this.logger.info(
          `ProspectPersonUpsertService.ensurePersonProject: Concurrent insert, fetching existing`,
        );
        const existing = await this.personProjectRepoService.get(
          {
            where: { ProjectID: projectId, PersonID: personId },
          },
          false,
        );
        if (existing.data) {
          return { data: existing.data, error: null };
        }
      }

      this.logger.error(
        `ProspectPersonUpsertService.ensurePersonProject: Error [error=${error.message}, stack=${error.stack}]`,
      );
      return { data: null, error };
    }
  }

  /**
   * Invalidates previous PROSPECT_PERSON_SNAPSHOT documents for a person in a project.
   * Sets IsValid=false and stores InvalidatedMetaJson with supersession info.
   *
   * @param projectId - Project ID
   * @param personId - Person ID
   * @param newDocumentId - ID of the new document that supersedes old ones
   * @returns Number of documents invalidated
   */
  async invalidatePreviousSnapshots(
    projectId: number,
    personId: number,
    newDocumentId: number,
  ): Promise<number> {
    try {
      // Find all valid snapshots for this person/project
      const existingDocs = await Promisify<Document[]>(
        this.documentRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              Source: DocumentSource.PROSPECT,
              DocumentKind: DocumentKind.PROSPECT_PERSON_SNAPSHOT,
              IsValid: true,
            },
          },
          false, // don't panic if none found
        ),
      );

      if (!existingDocs || existingDocs.length === 0) {
        return 0;
      }

      // Filter out the new document
      const docsToInvalidate = existingDocs.filter(
        (doc) => doc.DocumentID !== newDocumentId,
      );

      if (docsToInvalidate.length === 0) {
        return 0;
      }

      const nowISOString = new Date().toISOString();
      const invalidatedMetaJson = {
        reason: 'superseded',
        supersededByDocumentId: newDocumentId,
        at: nowISOString,
      };

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

      this.logger.info(
        `ProspectPersonUpsertService.invalidatePreviousSnapshots: Invalidated ${docsToInvalidate.length} docs [projectId=${projectId}, personId=${personId}]`,
      );

      return docsToInvalidate.length;
    } catch (error) {
      this.logger.error(
        `ProspectPersonUpsertService.invalidatePreviousSnapshots: Error [error=${error.message}]`,
      );
      return 0;
    }
  }

  /**
   * Creates a PROSPECT_PERSON_SNAPSHOT document for a person.
   * Stores the full SearchItem as PayloadJson.
   *
   * @param projectId - Project ID
   * @param personId - Person ID
   * @param item - Full SearchItem to store
   * @param linkedinUrl - Canonical LinkedIn URL (SourceRef)
   * @param moduleRunId - Module run ID that created this
   * @returns ResultWithError containing the created Document
   */
  async createPersonSnapshot(
    projectId: number,
    personId: number,
    item: SearchItem,
    linkedinUrl: string,
    moduleRunId: number,
  ): Promise<ResultWithError> {
    try {
      const capturedAt = new Date();

      // Create hash for fingerprinting
      const hashInput = {
        projectId,
        personId,
        linkedinUrl,
        capturedAt: capturedAt.toISOString(),
      };
      const hash = sha256Hex(JSON.stringify(hashInput));

      const documentData: Partial<Document> = {
        ProjectID: projectId,
        PersonID: personId,
        Source: DocumentSource.PROSPECT,
        SourceRef: linkedinUrl,
        ContentType: 'application/json',
        DocumentKind: DocumentKind.PROSPECT_PERSON_SNAPSHOT,
        IsValid: true,
        InvalidatedMetaJson: null,
        StorageUri: 'inline://document',
        Hash: hash,
        CapturedAt: capturedAt,
        ModuleRunID: moduleRunId,
        PayloadJson: item,
      };

      const document = await Promisify<Document>(
        this.documentRepoService.create(documentData),
      );

      this.logger.info(
        `ProspectPersonUpsertService.createPersonSnapshot: Created [DocumentID=${document.DocumentID}, personId=${personId}]`,
      );

      return { data: document, error: null };
    } catch (error) {
      this.logger.error(
        `ProspectPersonUpsertService.createPersonSnapshot: Error [error=${error.message}, stack=${error.stack}]`,
      );
      return { data: null, error };
    }
  }

  /**
   * Processes a single prospect SearchItem end-to-end.
   * Upserts location, organization, person, creates PersonProject link,
   * and creates PROSPECT_PERSON_SNAPSHOT document with invalidation.
   *
   * @param item - SearchItem to process
   * @param projectId - Project ID
   * @param moduleRunId - Module run ID
   * @param triggeredByUserId - User who triggered the run
   * @returns ProspectItemProcessResult with all IDs and status
   */
  async processItem(
    item: SearchItem,
    projectId: number,
    moduleRunId: number,
    triggeredByUserId: number,
  ): Promise<ProspectItemProcessResult> {
    const result: ProspectItemProcessResult = {
      success: false,
      linkedinUrl: null,
      personId: null,
      organizationId: null,
      locationId: null,
      personProjectId: null,
      snapshotDocumentId: null,
      skippedReason: null,
      error: null,
    };

    try {
      // 1. Canonicalize LinkedIn URL
      const rawLinkedinUrl =
        item.linkedin_url || item.enriched?.profile?.profile_id;
      const linkedinUrl = safeNormalizeLinkedinUrl(rawLinkedinUrl);
      result.linkedinUrl = linkedinUrl;

      if (!linkedinUrl) {
        result.skippedReason = 'missing_linkedin_url';
        return result;
      }

      // 2. Parse and upsert person location
      const parsedPersonLocation = parseLocationFromProspect(item);
      const personLocation = await Promisify<Location | null>(
        this.upsertLocation(parsedPersonLocation),
      );
      result.locationId = personLocation?.LocationID || null;

      // 3. Map and upsert company
      const mappedCompany = mapProspectCompany(item);
      let organization: Organization | null = null;

      if (mappedCompany) {
        // Parse company location (may be different from person location)
        const parsedCompanyLocation = parseCompanyLocationFromProspect(item);
        let companyLocation: Location | null = null;

        if (
          parsedCompanyLocation.normalizedKey !== 'unknown' &&
          parsedCompanyLocation.normalizedKey !==
            parsedPersonLocation.normalizedKey
        ) {
          companyLocation = await Promisify<Location | null>(
            this.upsertLocation(parsedCompanyLocation),
          );
        } else if (
          parsedCompanyLocation.normalizedKey ===
          parsedPersonLocation.normalizedKey
        ) {
          companyLocation = personLocation;
        }

        organization = await Promisify<Organization | null>(
          this.upsertOrganization(mappedCompany, companyLocation),
        );
        result.organizationId = organization?.OrganizationID || null;
      }

      // 4. Upsert person
      const person = await Promisify<Person | null>(
        this.upsertPersonFromProspect(item, organization, personLocation),
      );

      if (!person) {
        result.skippedReason = 'person_upsert_failed';
        return result;
      }

      result.personId = person.PersonID;

      // 5. Ensure PersonProject link
      const personProject = await Promisify<PersonProject>(
        this.ensurePersonProject(projectId, person.PersonID, triggeredByUserId),
      );
      result.personProjectId = personProject.PersonProjectID;

      // 6. Create PROSPECT_PERSON_SNAPSHOT document
      const snapshotDoc = await Promisify<Document>(
        this.createPersonSnapshot(
          projectId,
          person.PersonID,
          item,
          linkedinUrl,
          moduleRunId,
        ),
      );
      result.snapshotDocumentId = snapshotDoc.DocumentID;

      // 7. Invalidate previous snapshots
      await this.invalidatePreviousSnapshots(
        projectId,
        person.PersonID,
        snapshotDoc.DocumentID,
      );

      result.success = true;
      return result;
    } catch (error) {
      result.error = error;
      this.logger.error(
        `ProspectPersonUpsertService.processItem: Error [linkedinUrl=${result.linkedinUrl}, error=${error.message}]`,
      );
      return result;
    }
  }

  /**
   * Processes all items from a prospect search response.
   * Handles errors gracefully - one bad item does not fail the entire run.
   *
   * @param items - Array of SearchItems to process
   * @param projectId - Project ID
   * @param moduleRunId - Module run ID
   * @param triggeredByUserId - User who triggered the run
   * @returns ProspectProcessingSummary with counts and failures
   */
  async processAllItems(
    items: SearchItem[],
    projectId: number,
    moduleRunId: number,
    triggeredByUserId: number,
  ): Promise<ProspectProcessingSummary> {
    const summary: ProspectProcessingSummary = {
      itemsProcessed: 0,
      personsUpserted: 0,
      organizationsUpserted: 0,
      locationsUpserted: 0,
      linksCreated: 0,
      snapshotDocsInserted: 0,
      itemsSkippedMissingLinkedinUrl: 0,
      itemsFailedWithError: 0,
      failures: [],
    };

    // Track unique IDs to count upserts correctly
    const uniquePersonIds = new Set<number>();
    const uniqueOrgIds = new Set<number>();
    const uniqueLocationIds = new Set<number>();
    const newPersonProjectIds = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      summary.itemsProcessed++;

      const result = await this.processItem(
        item,
        projectId,
        moduleRunId,
        triggeredByUserId,
      );

      if (result.success) {
        if (result.personId) uniquePersonIds.add(result.personId);
        if (result.organizationId) uniqueOrgIds.add(result.organizationId);
        if (result.locationId) uniqueLocationIds.add(result.locationId);
        if (result.personProjectId)
          newPersonProjectIds.add(result.personProjectId);
        if (result.snapshotDocumentId) summary.snapshotDocsInserted++;
      } else if (result.skippedReason === 'missing_linkedin_url') {
        summary.itemsSkippedMissingLinkedinUrl++;
      } else if (result.error) {
        summary.itemsFailedWithError++;
        summary.failures.push({
          itemIndex: i,
          linkedinUrl: result.linkedinUrl,
          error: result.error.message,
        });
      }
    }

    summary.personsUpserted = uniquePersonIds.size;
    summary.organizationsUpserted = uniqueOrgIds.size;
    summary.locationsUpserted = uniqueLocationIds.size;
    summary.linksCreated = newPersonProjectIds.size;

    this.logger.info(
      `ProspectPersonUpsertService.processAllItems: Completed [itemsProcessed=${summary.itemsProcessed}, personsUpserted=${summary.personsUpserted}, orgsUpserted=${summary.organizationsUpserted}, locationsUpserted=${summary.locationsUpserted}, linksCreated=${summary.linksCreated}, snapshotsInserted=${summary.snapshotDocsInserted}, skippedNoUrl=${summary.itemsSkippedMissingLinkedinUrl}, failed=${summary.itemsFailedWithError}]`,
    );

    return summary;
  }
}

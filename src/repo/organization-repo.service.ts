import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class OrganizationRepoService {
  private organizationRepo: Repository<Organization>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.organizationRepo = entitymanager.getRepository(Organization);
  }

  async get(
    options: FindOneOptions<Organization>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding organization [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.organizationRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Organization not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching organization [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Organization>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding organizations [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.organizationRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No organizations found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching organizations [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(organization: Partial<Organization>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating organization [data: ${JSON.stringify(organization)}]`,
      );

      const newOrg = this.organizationRepo.create(organization);
      const result = await this.organizationRepo.save(newOrg);

      this.logger.info(
        `Organization created [OrganizationID: ${result.OrganizationID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating organization [data: ${JSON.stringify(
          organization,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Organization>,
    organization: QueryDeepPartialEntity<Organization>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating organization [condition: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(organization)}]`,
      );

      await this.organizationRepo.update(where, organization);
      const updated = await this.organizationRepo.findOne({ where });

      this.logger.info(
        `Organization updated [OrganizationID: ${updated?.OrganizationID}]`,
      );
      return { data: updated, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating organization [condition: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<Organization>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting organization [condition: ${JSON.stringify(where)}]`,
      );

      const result = await this.organizationRepo.delete(where);

      this.logger.info(`Organization deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting organization [condition: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<Organization>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting organizations [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.organizationRepo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting organizations [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Upsert organization by dedupe keys (LinkedinCompanyUrn > Domain > Name+LocationID).
   * Deduplication priority:
   *   1. LinkedinCompanyUrn (most reliable, unique if not null)
   *   2. Domain (unique if not null)
   *   3. Name + LocationID (fallback, not unique)
   * @returns The upserted Organization entity
   */
  async upsert(organization: Partial<Organization>): Promise<ResultWithError> {
    try {
      if (!organization.Name) {
        throw new GenericError(
          'Name is required for organization upsert',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.info(
        `Upserting organization [Name: ${organization.Name}, LinkedinCompanyUrn: ${organization.LinkedinCompanyUrn}, Domain: ${organization.Domain}]`,
      );

      let existing: Organization | null = null;

      // Try to find by LinkedinCompanyUrn first (most reliable)
      if (organization.LinkedinCompanyUrn) {
        existing = await this.organizationRepo.findOne({
          where: { LinkedinCompanyUrn: organization.LinkedinCompanyUrn },
        });
      }

      // Try Domain if no match by URN
      if (!existing && organization.Domain) {
        existing = await this.organizationRepo.findOne({
          where: { Domain: organization.Domain },
        });
      }

      // Fallback to Name + LocationID (only if LocationID is provided)
      if (!existing && organization.LocationID) {
        const normalizedName = organization.Name.toLowerCase().trim();
        existing = await this.organizationRepo.findOne({
          where: {
            NameNormalized: normalizedName,
            LocationID: organization.LocationID,
          },
        });
      }

      if (existing) {
        // Update existing organization - merge new data
        const updateData: QueryDeepPartialEntity<Organization> = {};

        if (organization.NameNormalized !== undefined)
          updateData.NameNormalized = organization.NameNormalized;
        if (organization.Domain !== undefined && !existing.Domain)
          updateData.Domain = organization.Domain;
        if (organization.Website !== undefined)
          updateData.Website = organization.Website;
        if (organization.LinkedinUrl !== undefined)
          updateData.LinkedinUrl = organization.LinkedinUrl;
        if (organization.LinkedinCompanyId !== undefined)
          updateData.LinkedinCompanyId = organization.LinkedinCompanyId;
        if (
          organization.LinkedinCompanyUrn !== undefined &&
          !existing.LinkedinCompanyUrn
        ) {
          updateData.LinkedinCompanyUrn = organization.LinkedinCompanyUrn;
        }
        if (organization.Industry !== undefined)
          updateData.Industry = organization.Industry;
        if (organization.SizeRange !== undefined)
          updateData.SizeRange = organization.SizeRange;
        if (organization.FoundedYear !== undefined)
          updateData.FoundedYear = organization.FoundedYear;
        if (organization.Type !== undefined)
          updateData.Type = organization.Type;
        if (organization.InferredRevenue !== undefined)
          updateData.InferredRevenue = organization.InferredRevenue;
        if (organization.TotalFundingRaised !== undefined)
          updateData.TotalFundingRaised = organization.TotalFundingRaised;
        if (organization.LocationID !== undefined)
          updateData.LocationID = organization.LocationID;

        if (Object.keys(updateData).length > 0) {
          await this.organizationRepo.update(
            { OrganizationID: existing.OrganizationID },
            updateData,
          );
        }

        const updatedOrg = await this.organizationRepo.findOne({
          where: { OrganizationID: existing.OrganizationID },
        });

        this.logger.info(
          `Organization upserted (updated) [OrganizationID: ${existing.OrganizationID}]`,
        );
        return { data: updatedOrg, error: null };
      } else {
        // Create new organization
        const orgData = {
          ...organization,
          NameNormalized: organization.Name.toLowerCase().trim(),
        };
        const newOrg = this.organizationRepo.create(orgData);
        const result = await this.organizationRepo.save(newOrg);

        this.logger.info(
          `Organization upserted (created) [OrganizationID: ${result.OrganizationID}]`,
        );
        return { data: result, error: null };
      }
    } catch (error) {
      this.logger.error(
        `Error in upserting organization [Name: ${organization.Name}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

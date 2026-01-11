import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
  IsNull,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Claim } from './entities/claim.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

interface InsertClaimParams {
  ProjectID: number;
  PersonID: number;
  ClaimType: string;
  GroupKey?: string;
  ValueJson: any;
  Confidence: number;
  ObservedAt?: Date;
  ValidFrom?: Date;
  ValidTo?: Date;
  SourceDocumentID: number;
  ModuleRunID: number;
  SchemaVersion: string;
}

@Injectable()
export class ClaimRepoService {
  private claimRepo: Repository<Claim>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.claimRepo = entitymanager.getRepository(Claim);
  }

  async get(
    options: FindOneOptions<Claim>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Finding claim [condition: ${JSON.stringify(options)}]`);

      const result = await this.claimRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Claim not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching claim [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Claim>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding claims [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.claimRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No claims found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching claims [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(claim: Partial<Claim>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating claim [data: ${JSON.stringify(claim)}]`);

      const newClaim = this.claimRepo.create(claim);
      const result = await this.claimRepo.save(newClaim);

      this.logger.info(`Claim created [ClaimID: ${result.ClaimID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating claim [data: ${JSON.stringify(claim)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Claim>,
    claim: QueryDeepPartialEntity<Claim>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating claim [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(claim)}]`,
      );

      const result = await this.claimRepo.update(where, claim);

      this.logger.info(`Claim updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating claim [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(claim)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Claim>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting claim [where: ${JSON.stringify(where)}]`);

      const result = await this.claimRepo.delete(where);

      this.logger.info(`Claim deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting claim [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async insertClaimAndSupersedePrevious(
    params: InsertClaimParams,
  ): Promise<ResultWithError> {
    const queryRunner = this.entitymanager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.info(
        `Inserting claim and superseding previous [params: ${JSON.stringify(
          params,
        )}]`,
      );

      // Step 1: Insert new claim
      const newClaim = this.claimRepo.create({
        ProjectID: params.ProjectID,
        PersonID: params.PersonID,
        ClaimType: params.ClaimType,
        GroupKey: params.GroupKey || null,
        ValueJson: params.ValueJson,
        Confidence: params.Confidence,
        ObservedAt: params.ObservedAt || null,
        ValidFrom: params.ValidFrom || null,
        ValidTo: params.ValidTo || null,
        SourceDocumentID: params.SourceDocumentID,
        ModuleRunID: params.ModuleRunID,
        SchemaVersion: params.SchemaVersion,
      });

      const savedClaim = await queryRunner.manager.save(newClaim);
      this.logger.info(`New claim inserted [ClaimID: ${savedClaim.ClaimID}]`);

      // Step 2: Find previous active claims to supersede
      const whereCondition: FindOptionsWhere<Claim> = {
        ProjectID: params.ProjectID,
        PersonID: params.PersonID,
        ClaimType: params.ClaimType,
        SupersededAt: IsNull(),
      };

      if (params.GroupKey !== undefined) {
        whereCondition.GroupKey = params.GroupKey;
      }

      this.logger.info(
        `Finding previous active claims to supersede [condition: ${JSON.stringify(
          whereCondition,
        )}]`,
      );

      const previousClaims = await queryRunner.manager.find(Claim, {
        where: whereCondition,
      });

      // Filter out the newly created claim
      const claimsToSupersede = previousClaims.filter(
        (c) => c.ClaimID !== savedClaim.ClaimID,
      );

      this.logger.info(
        `Found ${claimsToSupersede.length} previous claims to supersede`,
      );

      // Step 3: Update previous claims
      if (claimsToSupersede.length > 0) {
        const now = new Date();
        for (const claim of claimsToSupersede) {
          await queryRunner.manager.update(
            Claim,
            { ClaimID: claim.ClaimID },
            {
              SupersededAt: now,
              ReplacedByClaimID: savedClaim.ClaimID,
            },
          );
          this.logger.info(
            `Superseded claim [ClaimID: ${claim.ClaimID}, ReplacedByClaimID: ${savedClaim.ClaimID}]`,
          );
        }
      }

      await queryRunner.commitTransaction();

      this.logger.info(
        `Successfully inserted claim and superseded ${claimsToSupersede.length} previous claims [ClaimID: ${savedClaim.ClaimID}]`,
      );

      return { data: savedClaim, error: null };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error in insertClaimAndSupersedePrevious [params: ${JSON.stringify(
          params,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    } finally {
      await queryRunner.release();
    }
  }
}

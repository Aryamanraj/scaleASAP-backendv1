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

  async count(options: FindManyOptions<Claim>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting claims [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.claimRepo.count(options);

      this.logger.info(`Claims count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting claims [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class LeadRepoService {
  private repo: Repository<Lead>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(Lead);
  }

  async get(
    options: FindOneOptions<Lead>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Finding lead [condition: ${JSON.stringify(options)}]`);

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Lead not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching lead [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Lead>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Finding leads [condition: ${JSON.stringify(options)}]`);

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No leads found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching leads [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<Lead>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating lead [name: ${data.FullName}, campaignId: ${data.CampaignID}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(`Lead created [ID: ${result.LeadID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating lead [name: ${data.FullName}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async createMany(data: Partial<Lead>[]): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating ${data.length} leads`);

      const newRecords = this.repo.create(data);
      const result = await this.repo.save(newRecords);

      this.logger.info(`Leads created [count: ${result.length}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in creating leads: ${error.stack}`);
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Lead>,
    data: QueryDeepPartialEntity<Lead>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Updating lead [where: ${JSON.stringify(where)}]`);

      const result = await this.repo.update(where, data);

      this.logger.info(`Lead updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating lead [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Lead>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting lead [where: ${JSON.stringify(where)}]`);

      const result = await this.repo.delete(where);

      this.logger.info(`Lead deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting lead [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<Lead>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting leads [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting leads: ${error.stack}`);
      return { data: null, error };
    }
  }
}

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { LeadSignal } from './entities/lead-signal.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class LeadSignalRepoService {
  private repo: Repository<LeadSignal>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(LeadSignal);
  }

  async get(
    options: FindOneOptions<LeadSignal>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding lead signal [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Lead signal not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching lead signal [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<LeadSignal>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding lead signals [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No lead signals found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching lead signals [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<LeadSignal>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating lead signal [leadId: ${data.LeadID}, type: ${data.SignalType}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(`Lead signal created [ID: ${result.LeadSignalID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating lead signal [leadId: ${data.LeadID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async createMany(data: Partial<LeadSignal>[]): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating ${data.length} lead signals`);

      const newRecords = this.repo.create(data);
      const result = await this.repo.save(newRecords);

      this.logger.info(`Lead signals created [count: ${result.length}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in creating lead signals: ${error.stack}`);
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<LeadSignal>,
    data: QueryDeepPartialEntity<LeadSignal>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating lead signal [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.update(where, data);

      this.logger.info(`Lead signal updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating lead signal [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<LeadSignal>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting lead signal [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.delete(where);

      this.logger.info(`Lead signal deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting lead signal [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<LeadSignal>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting lead signals [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting lead signals: ${error.stack}`);
      return { data: null, error };
    }
  }
}

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Experiment } from './entities/experiment.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ExperimentRepoService {
  private repo: Repository<Experiment>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(Experiment);
  }

  async get(
    options: FindOneOptions<Experiment>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding experiment [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Experiment not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching experiment [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Experiment>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding experiments [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No experiments found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching experiments [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<Experiment>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating experiment [name: ${data.Name}, projectId: ${data.ProjectID}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(`Experiment created [ID: ${result.ExperimentID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating experiment [name: ${data.Name}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Experiment>,
    data: QueryDeepPartialEntity<Experiment>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Updating experiment [where: ${JSON.stringify(where)}]`);

      const result = await this.repo.update(where, data);

      this.logger.info(`Experiment updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating experiment [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Experiment>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting experiment [where: ${JSON.stringify(where)}]`);

      const result = await this.repo.delete(where);

      this.logger.info(`Experiment deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting experiment [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<Experiment>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting experiments [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting experiments: ${error.stack}`);
      return { data: null, error };
    }
  }
}

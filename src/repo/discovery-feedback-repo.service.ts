import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DiscoveryFeedback } from './entities/discovery-feedback.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class DiscoveryFeedbackRepoService {
  private repo: Repository<DiscoveryFeedback>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(DiscoveryFeedback);
  }

  async get(
    options: FindOneOptions<DiscoveryFeedback>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding discovery feedback [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Discovery feedback not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching discovery feedback [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<DiscoveryFeedback>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding discovery feedback records [condition: ${JSON.stringify(
          options,
        )}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No discovery feedback found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching discovery feedback records [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<DiscoveryFeedback>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating discovery feedback [projectId: ${data.ProjectID}, userId: ${data.UserID}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(
        `Discovery feedback created [ID: ${result.DiscoveryFeedbackID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating discovery feedback [projectId: ${data.ProjectID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<DiscoveryFeedback>,
    data: QueryDeepPartialEntity<DiscoveryFeedback>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating discovery feedback [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.update(where, data);

      this.logger.info(
        `Discovery feedback updated [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating discovery feedback [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<DiscoveryFeedback>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting discovery feedback [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.delete(where);

      this.logger.info(
        `Discovery feedback deleted [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting discovery feedback [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<DiscoveryFeedback>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting discovery feedback [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting discovery feedback: ${error.stack}`);
      return { data: null, error };
    }
  }
}

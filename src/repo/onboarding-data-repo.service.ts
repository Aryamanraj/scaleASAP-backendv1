import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { OnboardingData } from './entities/onboarding-data.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class OnboardingDataRepoService {
  private repo: Repository<OnboardingData>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(OnboardingData);
  }

  async get(
    options: FindOneOptions<OnboardingData>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding onboarding data [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Onboarding data not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching onboarding data [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<OnboardingData>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding onboarding data records [condition: ${JSON.stringify(
          options,
        )}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No onboarding data found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching onboarding data records [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<OnboardingData>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating onboarding data [projectId: ${data.ProjectID}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(
        `Onboarding data created [ID: ${result.OnboardingDataID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating onboarding data [projectId: ${data.ProjectID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<OnboardingData>,
    data: QueryDeepPartialEntity<OnboardingData>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating onboarding data [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.update(where, data);

      this.logger.info(
        `Onboarding data updated [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating onboarding data [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<OnboardingData>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting onboarding data [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.delete(where);

      this.logger.info(
        `Onboarding data deleted [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting onboarding data [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<OnboardingData>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting onboarding data [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting onboarding data: ${error.stack}`);
      return { data: null, error };
    }
  }
}

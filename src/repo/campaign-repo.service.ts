import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class CampaignRepoService {
  private repo: Repository<Campaign>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(Campaign);
  }

  async get(
    options: FindOneOptions<Campaign>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding campaign [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Campaign not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching campaign [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Campaign>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding campaigns [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No campaigns found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching campaigns [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<Campaign>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating campaign [name: ${data.Name}, projectId: ${data.ProjectID}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(`Campaign created [ID: ${result.CampaignID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating campaign [name: ${data.Name}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Campaign>,
    data: QueryDeepPartialEntity<Campaign>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Updating campaign [where: ${JSON.stringify(where)}]`);

      const result = await this.repo.update(where, data);

      this.logger.info(`Campaign updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating campaign [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Campaign>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting campaign [where: ${JSON.stringify(where)}]`);

      const result = await this.repo.delete(where);

      this.logger.info(`Campaign deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting campaign [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<Campaign>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting campaigns [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting campaigns: ${error.stack}`);
      return { data: null, error };
    }
  }
}

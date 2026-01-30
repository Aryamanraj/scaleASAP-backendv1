import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CampaignActivity } from './entities/campaign-activity.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class CampaignActivityRepoService {
  private repo: Repository<CampaignActivity>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(CampaignActivity);
  }

  async get(
    options: FindOneOptions<CampaignActivity>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding campaign activity [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Campaign activity not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching campaign activity [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<CampaignActivity>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding campaign activities [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No campaign activities found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching campaign activities [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<CampaignActivity>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating campaign activity [campaignId: ${data.CampaignID}, type: ${data.ActivityType}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(
        `Campaign activity created [ID: ${result.CampaignActivityID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating campaign activity [campaignId: ${data.CampaignID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<CampaignActivity>,
    data: QueryDeepPartialEntity<CampaignActivity>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating campaign activity [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.update(where, data);

      this.logger.info(
        `Campaign activity updated [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating campaign activity [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<CampaignActivity>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting campaign activity [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.delete(where);

      this.logger.info(
        `Campaign activity deleted [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting campaign activity [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<CampaignActivity>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting campaign activities [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting campaign activities: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

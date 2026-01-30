import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { OutreachMessage } from './entities/outreach-message.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class OutreachMessageRepoService {
  private repo: Repository<OutreachMessage>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(OutreachMessage);
  }

  async get(
    options: FindOneOptions<OutreachMessage>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding outreach message [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Outreach message not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching outreach message [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<OutreachMessage>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding outreach messages [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No outreach messages found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching outreach messages [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<OutreachMessage>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating outreach message [leadId: ${data.LeadID}, format: ${data.Format}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(
        `Outreach message created [ID: ${result.OutreachMessageID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating outreach message [leadId: ${data.LeadID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async createMany(data: Partial<OutreachMessage>[]): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating ${data.length} outreach messages`);

      const newRecords = this.repo.create(data);
      const result = await this.repo.save(newRecords);

      this.logger.info(`Outreach messages created [count: ${result.length}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in creating outreach messages: ${error.stack}`);
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<OutreachMessage>,
    data: QueryDeepPartialEntity<OutreachMessage>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating outreach message [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.update(where, data);

      this.logger.info(
        `Outreach message updated [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating outreach message [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<OutreachMessage>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting outreach message [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.repo.delete(where);

      this.logger.info(
        `Outreach message deleted [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting outreach message [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<OutreachMessage>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting outreach messages [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in counting outreach messages: ${error.stack}`);
      return { data: null, error };
    }
  }
}

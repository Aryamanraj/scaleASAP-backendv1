import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { GeneratedMessage } from './entities/generated-message.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';

@Injectable()
export class GeneratedMessageRepoService {
  private repo: Repository<GeneratedMessage>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(GeneratedMessage);
  }

  async get(
    options: FindOneOptions<GeneratedMessage>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding generated message [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Generated message not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching generated message [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<GeneratedMessage>,
    panic = false,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding generated messages [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.repo.find(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching generated messages [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(data: Partial<GeneratedMessage>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating generated message [leadId: ${data.LeadID}, platform: ${data.Platform}, type: ${data.MessageType}]`,
      );

      const newRecord = this.repo.create(data);
      const result = await this.repo.save(newRecord);

      this.logger.info(
        `Generated message created [ID: ${result.GeneratedMessageID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating generated message [leadId: ${data.LeadID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(id: number): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting generated message [ID: ${id}]`);

      const result = await this.repo.delete({ GeneratedMessageID: id });

      if (result.affected === 0) {
        throw new GenericError(
          'Generated message not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      this.logger.info(`Generated message deleted [ID: ${id}]`);
      return { data: { deleted: true, id }, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting generated message [ID: ${id}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getByLeadId(leadId: number): Promise<ResultWithError> {
    return this.getAll({
      where: { LeadID: leadId },
      order: { CreatedAt: 'DESC' },
    });
  }
}

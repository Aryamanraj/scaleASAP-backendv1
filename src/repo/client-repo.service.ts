import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ClientRepoService {
  private clientRepo: Repository<Client>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.clientRepo = entitymanager.getRepository(Client);
  }

  async get(
    options: FindOneOptions<Client>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding client [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.clientRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Client not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching client [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Client>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding clients [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.clientRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No clients found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching clients [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(client: Partial<Client>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating client [data: ${JSON.stringify(client)}]`);

      const newClient = this.clientRepo.create(client);
      const result = await this.clientRepo.save(newClient);

      this.logger.info(`Client created [ClientID: ${result.ClientID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating client [data: ${JSON.stringify(client)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Client>,
    client: QueryDeepPartialEntity<Client>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating client [condition: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(client)}]`,
      );

      await this.clientRepo.update(where, client);
      const updated = await this.clientRepo.findOne({ where });

      this.logger.info(`Client updated [ClientID: ${updated?.ClientID}]`);
      return { data: updated, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating client [condition: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Client>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting client [condition: ${JSON.stringify(where)}]`);

      const result = await this.clientRepo.delete(where);

      this.logger.info(`Client deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting client [condition: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<Client>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting clients [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.clientRepo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting clients [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

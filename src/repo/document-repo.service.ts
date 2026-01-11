import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class DocumentRepoService {
  private documentRepo: Repository<Document>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.documentRepo = entitymanager.getRepository(Document);
  }

  async get(
    options: FindOneOptions<Document>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding document [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.documentRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Document not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching document [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Document>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding documents [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.documentRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No documents found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching documents [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(document: Partial<Document>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating document [data: ${JSON.stringify(document)}]`);

      const newDocument = this.documentRepo.create(document);
      const result = await this.documentRepo.save(newDocument);

      this.logger.info(`Document created [DocumentID: ${result.DocumentID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating document [data: ${JSON.stringify(document)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Document>,
    document: QueryDeepPartialEntity<Document>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating document [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(document)}]`,
      );

      const result = await this.documentRepo.update(where, document);

      this.logger.info(`Document updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating document [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(document)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Document>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting document [where: ${JSON.stringify(where)}]`);

      const result = await this.documentRepo.delete(where);

      this.logger.info(`Document deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting document [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<Document>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting documents [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.documentRepo.count(options);

      this.logger.info(`Documents count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting documents [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

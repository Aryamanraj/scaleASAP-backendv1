import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ContentChunk } from './entities/content-chunk.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ContentChunkRepoService {
  private contentChunkRepo: Repository<ContentChunk>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.contentChunkRepo = entitymanager.getRepository(ContentChunk);
  }

  async get(
    options: FindOneOptions<ContentChunk>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding content chunk [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.contentChunkRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Content chunk not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching content chunk [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<ContentChunk>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding content chunks [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.contentChunkRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No content chunks found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching content chunks [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(contentChunk: Partial<ContentChunk>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating content chunk [data: ${JSON.stringify(contentChunk)}]`,
      );

      const newContentChunk = this.contentChunkRepo.create(contentChunk);
      const result = await this.contentChunkRepo.save(newContentChunk);

      this.logger.info(
        `Content chunk created [ContentChunkID: ${result.ContentChunkID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating content chunk [data: ${JSON.stringify(
          contentChunk,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<ContentChunk>,
    contentChunk: QueryDeepPartialEntity<ContentChunk>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating content chunk [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(contentChunk)}]`,
      );

      const result = await this.contentChunkRepo.update(where, contentChunk);

      this.logger.info(`Content chunk updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating content chunk [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(contentChunk)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<ContentChunk>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting content chunk [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.contentChunkRepo.delete(where);

      this.logger.info(`Content chunk deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting content chunk [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<ContentChunk>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting content chunks [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.contentChunkRepo.count(options);

      this.logger.info(`Content chunks count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting content chunks [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

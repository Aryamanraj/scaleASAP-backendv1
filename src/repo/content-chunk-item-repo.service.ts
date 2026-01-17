import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ContentChunkItem } from './entities/content-chunk-item.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ContentChunkItemRepoService {
  private contentChunkItemRepo: Repository<ContentChunkItem>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.contentChunkItemRepo = entitymanager.getRepository(ContentChunkItem);
  }

  async get(
    options: FindOneOptions<ContentChunkItem>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding content chunk item [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.contentChunkItemRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Content chunk item not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching content chunk item [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<ContentChunkItem>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding content chunk items [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.contentChunkItemRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No content chunk items found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching content chunk items [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    contentChunkItem: Partial<ContentChunkItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating content chunk item [data: ${JSON.stringify(
          contentChunkItem,
        )}]`,
      );

      const newContentChunkItem =
        this.contentChunkItemRepo.create(contentChunkItem);
      const result = await this.contentChunkItemRepo.save(newContentChunkItem);

      this.logger.info(
        `Content chunk item created [ContentChunkItemID: ${result.ContentChunkItemID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating content chunk item [data: ${JSON.stringify(
          contentChunkItem,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<ContentChunkItem>,
    contentChunkItem: QueryDeepPartialEntity<ContentChunkItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating content chunk item [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(contentChunkItem)}]`,
      );

      const result = await this.contentChunkItemRepo.update(
        where,
        contentChunkItem,
      );

      this.logger.info(
        `Content chunk item updated [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating content chunk item [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(contentChunkItem)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<ContentChunkItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting content chunk item [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.contentChunkItemRepo.delete(where);

      this.logger.info(
        `Content chunk item deleted [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting content chunk item [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<ContentChunkItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting content chunk items [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.contentChunkItemRepo.count(options);

      this.logger.info(`Content chunk items count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting content chunk items [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

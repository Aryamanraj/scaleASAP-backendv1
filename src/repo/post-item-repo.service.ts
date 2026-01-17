import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { PostItem } from './entities/post-item.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class PostItemRepoService {
  private postItemRepo: Repository<PostItem>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.postItemRepo = entitymanager.getRepository(PostItem);
  }

  async get(
    options: FindOneOptions<PostItem>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding post item [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.postItemRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Post item not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching post item [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PostItem>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding post items [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.postItemRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No post items found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching post items [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(postItem: Partial<PostItem>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating post item [data: ${JSON.stringify(postItem)}]`,
      );

      const newPostItem = this.postItemRepo.create(postItem);
      const result = await this.postItemRepo.save(newPostItem);

      this.logger.info(`Post item created [PostItemID: ${result.PostItemID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating post item [data: ${JSON.stringify(postItem)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<PostItem>,
    postItem: QueryDeepPartialEntity<PostItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating post item [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(postItem)}]`,
      );

      const result = await this.postItemRepo.update(where, postItem);

      this.logger.info(`Post item updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating post item [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(postItem)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<PostItem>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting post item [where: ${JSON.stringify(where)}]`);

      const result = await this.postItemRepo.delete(where);

      this.logger.info(`Post item deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting post item [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<PostItem>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting post items [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.postItemRepo.count(options);

      this.logger.info(`Post items count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting post items [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

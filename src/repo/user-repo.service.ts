import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class UserRepoService {
  private userRepo: Repository<User>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.userRepo = entitymanager.getRepository(User);
  }

  async get(
    options: FindOneOptions<User>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Finding user [condition: ${JSON.stringify(options)}]`);

      const result = await this.userRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('User not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching user [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<User>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Finding users [condition: ${JSON.stringify(options)}]`);

      const result = await this.userRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No users found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching users [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(user: Partial<User>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating user [data: ${JSON.stringify(user)}]`);

      const newUser = this.userRepo.create(user);
      const result = await this.userRepo.save(newUser);

      this.logger.info(`User created [UserID: ${result.UserID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating user [data: ${JSON.stringify(user)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<User>,
    user: QueryDeepPartialEntity<User>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating user [where: ${JSON.stringify(where)}, data: ${JSON.stringify(
          user,
        )}]`,
      );

      const result = await this.userRepo.update(where, user);

      this.logger.info(`User updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating user [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(user)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<User>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting user [where: ${JSON.stringify(where)}]`);

      const result = await this.userRepo.delete(where);

      this.logger.info(`User deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting user [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

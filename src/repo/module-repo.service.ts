import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Module } from './entities/module.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ModuleRepoService {
  private moduleRepo: Repository<Module>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.moduleRepo = entitymanager.getRepository(Module);
  }

  async get(
    options: FindOneOptions<Module>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding module [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.moduleRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Module not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching module [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Module>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding modules [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.moduleRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No modules found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching modules [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(module: Partial<Module>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating module [data: ${JSON.stringify(module)}]`);

      const newModule = this.moduleRepo.create(module);
      const result = await this.moduleRepo.save(newModule);

      this.logger.info(`Module created [ModuleID: ${result.ModuleID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating module [data: ${JSON.stringify(module)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Module>,
    module: QueryDeepPartialEntity<Module>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating module [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(module)}]`,
      );

      const result = await this.moduleRepo.update(where, module);

      this.logger.info(`Module updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating module [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(module)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Module>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting module [where: ${JSON.stringify(where)}]`);

      const result = await this.moduleRepo.delete(where);

      this.logger.info(`Module deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting module [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

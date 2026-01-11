import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ModuleRun } from './entities/module-run.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ModuleRunRepoService {
  private moduleRunRepo: Repository<ModuleRun>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.moduleRunRepo = entitymanager.getRepository(ModuleRun);
  }

  async get(
    options: FindOneOptions<ModuleRun>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding module run [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.moduleRunRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Module run not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching module run [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<ModuleRun>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding module runs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.moduleRunRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No module runs found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching module runs [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(moduleRun: Partial<ModuleRun>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating module run [data: ${JSON.stringify(moduleRun)}]`,
      );

      const newModuleRun = this.moduleRunRepo.create(moduleRun);
      const result = await this.moduleRunRepo.save(newModuleRun);

      this.logger.info(
        `Module run created [ModuleRunID: ${result.ModuleRunID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating module run [data: ${JSON.stringify(moduleRun)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<ModuleRun>,
    moduleRun: QueryDeepPartialEntity<ModuleRun>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating module run [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(moduleRun)}]`,
      );

      const result = await this.moduleRunRepo.update(where, moduleRun);

      this.logger.info(`Module run updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating module run [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(moduleRun)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<ModuleRun>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting module run [where: ${JSON.stringify(where)}]`);

      const result = await this.moduleRunRepo.delete(where);

      this.logger.info(`Module run deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting module run [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

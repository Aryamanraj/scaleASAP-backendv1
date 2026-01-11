import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ProjectRepoService {
  private projectRepo: Repository<Project>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.projectRepo = entitymanager.getRepository(Project);
  }

  async get(
    options: FindOneOptions<Project>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding project [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.projectRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Project not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching project [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Project>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding projects [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.projectRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No projects found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching projects [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(project: Partial<Project>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating project [data: ${JSON.stringify(project)}]`);

      const newProject = this.projectRepo.create(project);
      const result = await this.projectRepo.save(newProject);

      this.logger.info(`Project created [ProjectID: ${result.ProjectID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating project [data: ${JSON.stringify(project)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Project>,
    project: QueryDeepPartialEntity<Project>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating project [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(project)}]`,
      );

      const result = await this.projectRepo.update(where, project);

      this.logger.info(`Project updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating project [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(project)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Project>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting project [where: ${JSON.stringify(where)}]`);

      const result = await this.projectRepo.delete(where);

      this.logger.info(`Project deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting project [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

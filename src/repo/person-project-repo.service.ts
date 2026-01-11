import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { PersonProject } from './entities/person-project.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class PersonProjectRepoService {
  private personProjectRepo: Repository<PersonProject>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.personProjectRepo = entitymanager.getRepository(PersonProject);
  }

  async get(
    options: FindOneOptions<PersonProject>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding person project [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.personProjectRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Person project not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching person project [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<PersonProject>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding person projects [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.personProjectRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No person projects found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching person projects [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    personProject: Partial<PersonProject>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating person project [data: ${JSON.stringify(personProject)}]`,
      );

      const newPersonProject = this.personProjectRepo.create(personProject);
      const result = await this.personProjectRepo.save(newPersonProject);

      this.logger.info(
        `Person project created [PersonProjectID: ${result.PersonProjectID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating person project [data: ${JSON.stringify(
          personProject,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<PersonProject>,
    personProject: QueryDeepPartialEntity<PersonProject>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating person project [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(personProject)}]`,
      );

      const result = await this.personProjectRepo.update(where, personProject);

      this.logger.info(`Person project updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating person project [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(personProject)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<PersonProject>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting person project [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.personProjectRepo.delete(where);

      this.logger.info(`Person project deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting person project [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<PersonProject>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonProjectRepoService.count: Counting PersonProjects`,
      );
      const count = await this.personProjectRepo.count(options);
      this.logger.info(
        `PersonProjectRepoService.count: Found ${count} PersonProjects`,
      );
      return { data: count, error: null };
    } catch (error) {
      this.logger.error(
        `PersonProjectRepoService.count: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

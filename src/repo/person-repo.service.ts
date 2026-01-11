import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class PersonRepoService {
  private personRepo: Repository<Person>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.personRepo = entitymanager.getRepository(Person);
  }

  async get(
    options: FindOneOptions<Person>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding person [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.personRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Person not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching person [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Person>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding persons [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.personRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No persons found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching persons [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(person: Partial<Person>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating person [data: ${JSON.stringify(person)}]`);

      const newPerson = this.personRepo.create(person);
      const result = await this.personRepo.save(newPerson);

      this.logger.info(`Person created [PersonID: ${result.PersonID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating person [data: ${JSON.stringify(person)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Person>,
    person: QueryDeepPartialEntity<Person>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating person [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(person)}]`,
      );

      const result = await this.personRepo.update(where, person);

      this.logger.info(`Person updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating person [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(person)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Person>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting person [where: ${JSON.stringify(where)}]`);

      const result = await this.personRepo.delete(where);

      this.logger.info(`Person deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting person [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

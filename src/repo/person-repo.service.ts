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

  async count(where?: FindOptionsWhere<Person>): Promise<ResultWithError> {
    try {
      this.logger.info(`Counting persons [where: ${JSON.stringify(where)}]`);

      const result = await this.personRepo.count({ where });

      this.logger.info(`Person count [count: ${result}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting persons [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  /**
   * Upsert person by LinkedinUrl (unique constraint).
   * If person with matching LinkedinUrl exists, updates it; otherwise creates new.
   * @returns The upserted Person entity
   */
  async upsert(person: Partial<Person>): Promise<ResultWithError> {
    try {
      if (!person.LinkedinUrl) {
        throw new GenericError(
          'LinkedinUrl is required for person upsert',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.info(`Upserting person [LinkedinUrl: ${person.LinkedinUrl}]`);

      // Try to find existing person by LinkedinUrl
      const existing = await this.personRepo.findOne({
        where: { LinkedinUrl: person.LinkedinUrl },
      });

      if (existing) {
        // Update existing person - merge new data
        const updateData: QueryDeepPartialEntity<Person> = {};

        if (person.LinkedinSlug !== undefined)
          updateData.LinkedinSlug = person.LinkedinSlug;
        if (person.ExternalUrn !== undefined)
          updateData.ExternalUrn = person.ExternalUrn;
        if (person.PrimaryDisplayName !== undefined)
          updateData.PrimaryDisplayName = person.PrimaryDisplayName;
        if (person.FirstName !== undefined)
          updateData.FirstName = person.FirstName;
        if (person.LastName !== undefined)
          updateData.LastName = person.LastName;
        if (person.Headline !== undefined)
          updateData.Headline = person.Headline;
        if (person.SubTitle !== undefined)
          updateData.SubTitle = person.SubTitle;
        if (person.CurrentOrganizationID !== undefined)
          updateData.CurrentOrganizationID = person.CurrentOrganizationID;
        if (person.LocationID !== undefined)
          updateData.LocationID = person.LocationID;
        if (person.Status !== undefined) updateData.Status = person.Status;

        if (Object.keys(updateData).length > 0) {
          await this.personRepo.update(
            { PersonID: existing.PersonID },
            updateData,
          );
        }

        const updatedPerson = await this.personRepo.findOne({
          where: { PersonID: existing.PersonID },
        });

        this.logger.info(
          `Person upserted (updated) [PersonID: ${existing.PersonID}]`,
        );
        return { data: updatedPerson, error: null };
      } else {
        // Create new person
        const newPerson = this.personRepo.create(person);
        const result = await this.personRepo.save(newPerson);

        this.logger.info(
          `Person upserted (created) [PersonID: ${result.PersonID}]`,
        );
        return { data: result, error: null };
      }
    } catch (error) {
      this.logger.error(
        `Error in upserting person [LinkedinUrl: ${person.LinkedinUrl}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

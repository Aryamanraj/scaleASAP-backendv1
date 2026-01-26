import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class LocationRepoService {
  private locationRepo: Repository<Location>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.locationRepo = entitymanager.getRepository(Location);
  }

  async get(
    options: FindOneOptions<Location>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding location [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.locationRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Location not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching location [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Location>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding locations [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.locationRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No locations found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching locations [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(location: Partial<Location>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating location [data: ${JSON.stringify(location)}]`);

      const newLocation = this.locationRepo.create(location);
      const result = await this.locationRepo.save(newLocation);

      this.logger.info(`Location created [LocationID: ${result.LocationID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating location [data: ${JSON.stringify(location)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Location>,
    location: QueryDeepPartialEntity<Location>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating location [condition: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(location)}]`,
      );

      await this.locationRepo.update(where, location);
      const updated = await this.locationRepo.findOne({ where });

      this.logger.info(`Location updated [LocationID: ${updated?.LocationID}]`);
      return { data: updated, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating location [condition: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Location>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting location [condition: ${JSON.stringify(where)}]`,
      );

      const result = await this.locationRepo.delete(where);

      this.logger.info(`Location deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting location [condition: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options: FindManyOptions<Location>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting locations [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.locationRepo.count(options);

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting locations [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async upsert(location: Partial<Location>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Upserting location [data: ${JSON.stringify(location)}]`,
      );

      const result = await this.locationRepo.upsert(location, {
        conflictPaths: ['NormalizedKey'],
        skipUpdateIfNoValuesChanged: true,
      });

      const upserted = await this.locationRepo.findOne({
        where: { NormalizedKey: location.NormalizedKey },
      });

      this.logger.info(
        `Location upserted [LocationID: ${upserted?.LocationID}]`,
      );
      return { data: upserted, error: null };
    } catch (error) {
      this.logger.error(
        `Error in upserting location [data: ${JSON.stringify(location)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

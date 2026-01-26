import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DiscoveryRunItem } from './entities/discovery-run-item.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class DiscoveryRunItemRepoService {
  private discoveryRunItemRepo: Repository<DiscoveryRunItem>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.discoveryRunItemRepo = entitymanager.getRepository(DiscoveryRunItem);
  }

  async get(
    options: FindOneOptions<DiscoveryRunItem>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding discovery run item [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.discoveryRunItemRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Discovery run item not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching discovery run item [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<DiscoveryRunItem>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding discovery run items [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.discoveryRunItemRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No discovery run items found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching discovery run items [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    discoveryRunItem: Partial<DiscoveryRunItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating discovery run item [data: ${JSON.stringify(
          discoveryRunItem,
        )}]`,
      );

      const newItem = this.discoveryRunItemRepo.create(discoveryRunItem);
      const result = await this.discoveryRunItemRepo.save(newItem);

      this.logger.info(
        `Discovery run item created [DiscoveryRunItemID: ${result.DiscoveryRunItemID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating discovery run item [data: ${JSON.stringify(
          discoveryRunItem,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<DiscoveryRunItem>,
    discoveryRunItem: QueryDeepPartialEntity<DiscoveryRunItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating discovery run item [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(discoveryRunItem)}]`,
      );

      const result = await this.discoveryRunItemRepo.update(
        where,
        discoveryRunItem,
      );

      this.logger.info(
        `Discovery run item updated [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating discovery run item [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(discoveryRunItem)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<DiscoveryRunItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting discovery run item [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.discoveryRunItemRepo.delete(where);

      this.logger.info(
        `Discovery run item deleted [affected: ${result.affected}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting discovery run item [where: ${JSON.stringify(
          where,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async count(
    options?: FindManyOptions<DiscoveryRunItem>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting discovery run items [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.discoveryRunItemRepo.count(options);

      this.logger.info(`Discovery run items count [count: ${result}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting discovery run items [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

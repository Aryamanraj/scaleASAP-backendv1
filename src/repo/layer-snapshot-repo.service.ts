import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { LayerSnapshot } from './entities/layer-snapshot.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class LayerSnapshotRepoService {
  private layerSnapshotRepo: Repository<LayerSnapshot>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.layerSnapshotRepo = entitymanager.getRepository(LayerSnapshot);
  }

  async get(
    options: FindOneOptions<LayerSnapshot>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding layer snapshot [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.layerSnapshotRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Layer snapshot not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching layer snapshot [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<LayerSnapshot>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding layer snapshots [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.layerSnapshotRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No layer snapshots found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching layer snapshots [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    layerSnapshot: Partial<LayerSnapshot>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating layer snapshot [data: ${JSON.stringify(layerSnapshot)}]`,
      );

      const newLayerSnapshot = this.layerSnapshotRepo.create(layerSnapshot);
      const result = await this.layerSnapshotRepo.save(newLayerSnapshot);

      this.logger.info(
        `Layer snapshot created [LayerSnapshotID: ${result.LayerSnapshotID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating layer snapshot [data: ${JSON.stringify(
          layerSnapshot,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<LayerSnapshot>,
    layerSnapshot: QueryDeepPartialEntity<LayerSnapshot>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating layer snapshot [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(layerSnapshot)}]`,
      );

      const result = await this.layerSnapshotRepo.update(where, layerSnapshot);

      this.logger.info(`Layer snapshot updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating layer snapshot [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(layerSnapshot)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<LayerSnapshot>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting layer snapshot [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.layerSnapshotRepo.delete(where);

      this.logger.info(`Layer snapshot deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting layer snapshot [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<LayerSnapshot>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting layer snapshots [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.layerSnapshotRepo.count(options);

      this.logger.info(`Layer snapshots count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting layer snapshots [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

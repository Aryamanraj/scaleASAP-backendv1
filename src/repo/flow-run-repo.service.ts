import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { FlowRun } from './entities/flow-run.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class FlowRunRepoService {
  private flowRunRepo: Repository<FlowRun>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.flowRunRepo = entitymanager.getRepository(FlowRun);
  }

  async get(
    options: FindOneOptions<FlowRun>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding flow run [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.flowRunRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Flow run not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching flow run [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<FlowRun>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding flow runs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.flowRunRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No flow runs found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching flow runs [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(flowRun: Partial<FlowRun>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating flow run [data: ${JSON.stringify(flowRun)}]`);

      const newFlowRun = this.flowRunRepo.create(flowRun);
      const result = await this.flowRunRepo.save(newFlowRun);

      this.logger.info(`Flow run created [FlowRunID: ${result.FlowRunID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating flow run [data: ${JSON.stringify(flowRun)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<FlowRun>,
    flowRun: QueryDeepPartialEntity<FlowRun>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating flow run [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(flowRun)}]`,
      );

      const result = await this.flowRunRepo.update(where, flowRun);

      this.logger.info(`Flow run updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating flow run [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(flowRun)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<FlowRun>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting flow run [where: ${JSON.stringify(where)}]`);

      const result = await this.flowRunRepo.delete(where);

      this.logger.info(`Flow run deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting flow run [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(options?: FindManyOptions<FlowRun>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting flow runs [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.flowRunRepo.count(options);

      this.logger.info(`Flow runs count [count: ${result}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting flow runs [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

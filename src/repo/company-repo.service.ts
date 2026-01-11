import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class CompanyRepoService {
  private companyRepo: Repository<Company>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.companyRepo = entitymanager.getRepository(Company);
  }

  async get(
    options: FindOneOptions<Company>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding company [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.companyRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Company not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching company [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<Company>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding companies [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.companyRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No companies found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching companies [condition: ${JSON.stringify(options)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async create(company: Partial<Company>): Promise<ResultWithError> {
    try {
      this.logger.info(`Creating company [data: ${JSON.stringify(company)}]`);

      const newCompany = this.companyRepo.create(company);
      const result = await this.companyRepo.save(newCompany);

      this.logger.info(`Company created [CompanyID: ${result.CompanyID}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating company [data: ${JSON.stringify(company)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<Company>,
    company: QueryDeepPartialEntity<Company>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating company [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(company)}]`,
      );

      const result = await this.companyRepo.update(where, company);

      this.logger.info(`Company updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating company [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(company)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<Company>): Promise<ResultWithError> {
    try {
      this.logger.info(`Deleting company [where: ${JSON.stringify(where)}]`);

      const result = await this.companyRepo.delete(where);

      this.logger.info(`Company deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting company [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }
}

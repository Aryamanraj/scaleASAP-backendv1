import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ChunkEvidence } from './entities/chunk-evidence.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class ChunkEvidenceRepoService {
  private chunkEvidenceRepo: Repository<ChunkEvidence>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.chunkEvidenceRepo = entitymanager.getRepository(ChunkEvidence);
  }

  async get(
    options: FindOneOptions<ChunkEvidence>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding chunk evidence [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.chunkEvidenceRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError(
          'Chunk evidence not found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching chunk evidence [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<ChunkEvidence>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding chunk evidences [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.chunkEvidenceRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError(
          'No chunk evidences found!',
          HttpStatus.NOT_FOUND,
        );
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching chunk evidences [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(
    chunkEvidence: Partial<ChunkEvidence>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating chunk evidence [data: ${JSON.stringify(chunkEvidence)}]`,
      );

      const newChunkEvidence = this.chunkEvidenceRepo.create(chunkEvidence);
      const result = await this.chunkEvidenceRepo.save(newChunkEvidence);

      this.logger.info(
        `Chunk evidence created [ChunkEvidenceID: ${result.ChunkEvidenceID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating chunk evidence [data: ${JSON.stringify(
          chunkEvidence,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<ChunkEvidence>,
    chunkEvidence: QueryDeepPartialEntity<ChunkEvidence>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating chunk evidence [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(chunkEvidence)}]`,
      );

      const result = await this.chunkEvidenceRepo.update(where, chunkEvidence);

      this.logger.info(`Chunk evidence updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating chunk evidence [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(chunkEvidence)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(
    where: FindOptionsWhere<ChunkEvidence>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting chunk evidence [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.chunkEvidenceRepo.delete(where);

      this.logger.info(`Chunk evidence deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting chunk evidence [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async count(
    options: FindManyOptions<ChunkEvidence>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Counting chunk evidences [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.chunkEvidenceRepo.count(options);

      this.logger.info(`Chunk evidences count: ${result}`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in counting chunk evidences [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

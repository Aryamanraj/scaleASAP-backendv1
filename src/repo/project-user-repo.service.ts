import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntityManager,
  FindOneOptions,
  FindManyOptions,
  Repository,
  FindOptionsWhere,
} from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ProjectUser } from './entities/project-user.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ProjectUserRole } from '../common/constants/entity.constants';

@Injectable()
export class ProjectUserRepoService {
  private projectUserRepo: Repository<ProjectUser>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.projectUserRepo = entitymanager.getRepository(ProjectUser);
  }

  async get(
    options: FindOneOptions<ProjectUser>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding project user [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.projectUserRepo.findOne(options);
      if (!result && panic) {
        throw new GenericError('Project user not found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching project user [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async getAll(
    options: FindManyOptions<ProjectUser>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Finding project users [condition: ${JSON.stringify(options)}]`,
      );

      const result = await this.projectUserRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No project users found!', HttpStatus.NOT_FOUND);
      }

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in fetching project users [condition: ${JSON.stringify(
          options,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async create(projectUser: Partial<ProjectUser>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Creating project user [data: ${JSON.stringify(projectUser)}]`,
      );

      const newProjectUser = this.projectUserRepo.create(projectUser);
      const result = await this.projectUserRepo.save(newProjectUser);

      this.logger.info(
        `Project user created [ProjectUserID: ${result.ProjectUserID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in creating project user [data: ${JSON.stringify(
          projectUser,
        )}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async update(
    where: FindOptionsWhere<ProjectUser>,
    projectUser: QueryDeepPartialEntity<ProjectUser>,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Updating project user [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(projectUser)}]`,
      );

      const result = await this.projectUserRepo.update(where, projectUser);

      this.logger.info(`Project user updated [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in updating project user [where: ${JSON.stringify(
          where,
        )}, data: ${JSON.stringify(projectUser)}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async delete(where: FindOptionsWhere<ProjectUser>): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Deleting project user [where: ${JSON.stringify(where)}]`,
      );

      const result = await this.projectUserRepo.delete(where);

      this.logger.info(`Project user deleted [affected: ${result.affected}]`);
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error in deleting project user [where: ${JSON.stringify(where)}]: ${
          error.stack
        }`,
      );
      return { data: null, error };
    }
  }

  async isUserInProject(
    ProjectID: number,
    UserID: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Checking if user is in project [ProjectID: ${ProjectID}, UserID: ${UserID}]`,
      );

      const result = await this.projectUserRepo.findOne({
        where: { ProjectID, UserID },
      });

      const isInProject = !!result;
      this.logger.info(
        `User in project check result: ${isInProject} [ProjectID: ${ProjectID}, UserID: ${UserID}]`,
      );

      return { data: isInProject, error: null };
    } catch (error) {
      this.logger.error(
        `Error checking if user is in project [ProjectID: ${ProjectID}, UserID: ${UserID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async addUserToProject(
    ProjectID: number,
    UserID: number,
    ProjectRole: ProjectUserRole = ProjectUserRole.MEMBER,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Adding user to project [ProjectID: ${ProjectID}, UserID: ${UserID}, ProjectRole: ${ProjectRole}]`,
      );

      // Check if already exists
      const existing = await this.projectUserRepo.findOne({
        where: { ProjectID, UserID },
      });

      if (existing) {
        this.logger.info(
          `User already in project [ProjectID: ${ProjectID}, UserID: ${UserID}]`,
        );
        return { data: existing, error: null };
      }

      // Create new entry
      const newProjectUser = this.projectUserRepo.create({
        ProjectID,
        UserID,
        ProjectRole,
      });
      const result = await this.projectUserRepo.save(newProjectUser);

      this.logger.info(
        `User added to project [ProjectUserID: ${result.ProjectUserID}, ProjectID: ${ProjectID}, UserID: ${UserID}]`,
      );
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `Error adding user to project [ProjectID: ${ProjectID}, UserID: ${UserID}]: ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

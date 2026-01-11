import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { CompanyRepoService } from '../repo/company-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import { ProjectUserRepoService } from '../repo/project-user-repo.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Company } from '../repo/entities/company.entity';
import { User } from '../repo/entities/user.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { UserRole, EntityStatus } from '../common/constants/entity.constants';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private companyRepoService: CompanyRepoService,
    private userRepoService: UserRepoService,
    private projectUserRepoService: ProjectUserRepoService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `UserService.createUser: Creating user with email=${dto.email}, companyId=${dto.companyId}`,
      );

      // Ensure company exists
      await Promisify<Company>(
        this.companyRepoService.get(
          { where: { CompanyID: dto.companyId } },
          true,
        ),
      );

      const user = await Promisify<User>(
        this.userRepoService.create({
          CompanyID: dto.companyId,
          Email: dto.email,
          Name: dto.name,
          PasswordHash: dto.passwordHash,
          Role: dto.role || UserRole.MEMBER,
          Status: dto.status || EntityStatus.ACTIVE,
        }),
      );

      this.logger.info(
        `UserService.createUser: Successfully created user with UserID=${user.UserID}`,
      );

      return { error: null, data: user };
    } catch (error) {
      this.logger.error(`UserService.createUser: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  async listUsers(companyId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `UserService.listUsers: Fetching users for CompanyID=${companyId}`,
      );

      const users = await Promisify<User[]>(
        this.userRepoService.getAll({ where: { CompanyID: companyId } }, false),
      );

      this.logger.info(
        `UserService.listUsers: Found ${users.length} users for CompanyID=${companyId}`,
      );

      return { error: null, data: users };
    } catch (error) {
      this.logger.error(`UserService.listUsers: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  async getUserById(userId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `UserService.getUserById: Fetching user with UserID=${userId}`,
      );

      const user = await Promisify<User>(
        this.userRepoService.get({ where: { UserID: userId } }, true),
      );

      this.logger.info(
        `UserService.getUserById: Successfully fetched user with UserID=${userId}`,
      );

      return { error: null, data: user };
    } catch (error) {
      this.logger.error(`UserService.getUserById: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  async updateUser(
    userId: number,
    dto: UpdateUserDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `UserService.updateUser: Updating user with UserID=${userId}`,
      );

      // Ensure user exists
      await Promisify<User>(
        this.userRepoService.get({ where: { UserID: userId } }, true),
      );

      const updatedUser = await Promisify<User>(
        this.userRepoService.update(
          { UserID: userId },
          {
            ...(dto.name && { Name: dto.name }),
            ...(dto.role && { Role: dto.role }),
            ...(dto.status && { Status: dto.status }),
            ...(dto.passwordHash && { PasswordHash: dto.passwordHash }),
          },
        ),
      );

      this.logger.info(
        `UserService.updateUser: Successfully updated user with UserID=${userId}`,
      );

      return { error: null, data: updatedUser };
    } catch (error) {
      this.logger.error(`UserService.updateUser: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  async getUserProjects(userId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `UserService.getUserProjects: Fetching projects for UserID=${userId}`,
      );

      // Ensure user exists
      await Promisify<User>(
        this.userRepoService.get({ where: { UserID: userId } }, true),
      );

      const projectUsers = await Promisify<ProjectUser[]>(
        this.projectUserRepoService.getAll(
          { where: { UserID: userId } },
          false,
        ),
      );

      this.logger.info(
        `UserService.getUserProjects: Found ${projectUsers.length} projects for UserID=${userId}`,
      );

      return { error: null, data: projectUsers };
    } catch (error) {
      this.logger.error(`UserService.getUserProjects: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }
}

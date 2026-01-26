import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { ClientRepoService } from '../repo/client-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import { ProjectUserRepoService } from '../repo/project-user-repo.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectUserRole } from '../common/constants/entity.constants';
import { Client } from '../repo/entities/client.entity';
import { Project } from '../repo/entities/project.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { ResultWithError } from '../common/interfaces/index';

@Injectable()
export class CompanyProjectService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private clientRepoService: ClientRepoService,
    private projectRepoService: ProjectRepoService,
    private userRepoService: UserRepoService,
    private projectUserRepoService: ProjectUserRepoService,
  ) {}

  async createClient(dto: CreateClientDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.createClient: Creating client with name=${dto.name}`,
      );

      const client = await Promisify<Client>(
        this.clientRepoService.create({
          Name: dto.name,
          Slug: dto.slug,
        }),
      );

      this.logger.info(
        `CompanyProjectService.createClient: Successfully created client with ClientID=${client.ClientID}`,
      );

      return { error: null, data: client };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.createClient: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getAllClients(): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getAllClients: Fetching all clients`,
      );

      const clients = await Promisify<Client[]>(
        this.clientRepoService.getAll({}, false),
      );

      this.logger.info(
        `CompanyProjectService.getAllClients: Found ${clients.length} clients`,
      );

      return { error: null, data: clients };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getAllClients: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getClientById(clientId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getClientById: Fetching client with ClientID=${clientId}`,
      );

      const client = await Promisify<Client>(
        this.clientRepoService.get({ where: { ClientID: clientId } }, true),
      );

      this.logger.info(
        `CompanyProjectService.getClientById: Successfully fetched client with ClientID=${clientId}`,
      );

      return { error: null, data: client };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getClientById: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async updateClient(
    clientId: number,
    dto: UpdateClientDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.updateClient: Updating client with ClientID=${clientId}`,
      );

      // Ensure client exists
      await Promisify<Client>(
        this.clientRepoService.get({ where: { ClientID: clientId } }, true),
      );

      const updatedClient = await Promisify<Client>(
        this.clientRepoService.update(
          { ClientID: clientId },
          {
            ...(dto.name && { Name: dto.name }),
            ...(dto.slug && { Slug: dto.slug }),
          },
        ),
      );

      this.logger.info(
        `CompanyProjectService.updateClient: Successfully updated client with ClientID=${clientId}`,
      );

      return { error: null, data: updatedClient };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.updateClient: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async createProject(
    clientId: number,
    dto: CreateProjectDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.createProject: Creating project for ClientID=${clientId}, name=${dto.name}`,
      );

      // Ensure client exists
      await Promisify<Client>(
        this.clientRepoService.get({ where: { ClientID: clientId } }, true),
      );

      const project = await Promisify<Project>(
        this.projectRepoService.create({
          ClientID: clientId,
          Name: dto.name,
          ...(dto.status && { Status: dto.status }),
        }),
      );

      this.logger.info(
        `CompanyProjectService.createProject: Successfully created project with ProjectID=${project.ProjectID}`,
      );

      return { error: null, data: project };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.createProject: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getProjectsByClientId(clientId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getProjectsByClientId: Fetching projects for ClientID=${clientId}`,
      );

      // Ensure client exists
      await Promisify<Client>(
        this.clientRepoService.get({ where: { ClientID: clientId } }, true),
      );

      const projects = await Promisify<Project[]>(
        this.projectRepoService.getAll(
          { where: { ClientID: clientId } },
          false,
        ),
      );

      this.logger.info(
        `CompanyProjectService.getProjectsByClientId: Found ${projects.length} projects for ClientID=${clientId}`,
      );

      return { error: null, data: projects };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getProjectsByCompanyId: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getProjectById(projectId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getProjectById: Fetching project with ProjectID=${projectId}`,
      );

      const project = await Promisify<Project>(
        this.projectRepoService.get({ where: { ProjectID: projectId } }, true),
      );

      this.logger.info(
        `CompanyProjectService.getProjectById: Successfully fetched project with ProjectID=${projectId}`,
      );

      return { error: null, data: project };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getProjectById: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async updateProject(
    projectId: number,
    dto: UpdateProjectDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.updateProject: Updating project with ProjectID=${projectId}`,
      );

      // Ensure project exists
      await Promisify<Project>(
        this.projectRepoService.get({ where: { ProjectID: projectId } }, true),
      );

      const updatedProject = await Promisify<Project>(
        this.projectRepoService.update(
          { ProjectID: projectId },
          {
            ...(dto.name && { Name: dto.name }),
            ...(dto.status && { Status: dto.status }),
          },
        ),
      );

      this.logger.info(
        `CompanyProjectService.updateProject: Successfully updated project with ProjectID=${projectId}`,
      );

      return { error: null, data: updatedProject };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.updateProject: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async removeUserFromProject(
    projectId: number,
    userId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.removeUserFromProject: Removing UserID=${userId} from ProjectID=${projectId}`,
      );

      await Promisify(
        this.projectUserRepoService.delete({
          ProjectID: projectId,
          UserID: userId,
        }),
      );

      this.logger.info(
        `CompanyProjectService.removeUserFromProject: Successfully removed UserID=${userId} from ProjectID=${projectId}`,
      );

      return { error: null, data: { removed: true } };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.removeUserFromProject: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getProjectUsers(projectId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getProjectUsers: Fetching users for ProjectID=${projectId}`,
      );

      // Ensure project exists
      await Promisify<Project>(
        this.projectRepoService.get({ where: { ProjectID: projectId } }, true),
      );

      const projectUsers = await Promisify<ProjectUser[]>(
        this.projectUserRepoService.getAll(
          { where: { ProjectID: projectId } },
          false,
        ),
      );

      this.logger.info(
        `CompanyProjectService.getProjectUsers: Found ${projectUsers.length} users for ProjectID=${projectId}`,
      );

      return { error: null, data: projectUsers };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getProjectUsers: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async isUserInProject(
    projectId: number,
    userId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.isUserInProject: Checking if UserID=${userId} is in ProjectID=${projectId}`,
      );

      const projectUsers = await Promisify<ProjectUser[]>(
        this.projectUserRepoService.getAll(
          { where: { ProjectID: projectId, UserID: userId } },
          false,
        ),
      );

      const isInProject = projectUsers.length > 0;

      this.logger.info(
        `CompanyProjectService.isUserInProject: Result=${isInProject} for UserID=${userId}, ProjectID=${projectId}`,
      );

      return { error: null, data: isInProject };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.isUserInProject: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async addUserToProject(
    projectId: number,
    userId: number,
    projectRole: ProjectUserRole = ProjectUserRole.MEMBER,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.addUserToProject: Adding UserID=${userId} to ProjectID=${projectId} with role=${projectRole}`,
      );

      // Check if user already in project
      const existing = await Promisify<ProjectUser[]>(
        this.projectUserRepoService.getAll(
          { where: { ProjectID: projectId, UserID: userId } },
          false,
        ),
      );

      if (existing.length > 0) {
        this.logger.info(
          `CompanyProjectService.addUserToProject: UserID=${userId} already in ProjectID=${projectId}`,
        );
        return { error: null, data: existing[0] };
      }

      // Add user to project
      const projectUser = await Promisify<ProjectUser>(
        this.projectUserRepoService.create({
          ProjectID: projectId,
          UserID: userId,
          ProjectRole: projectRole,
        }),
      );

      this.logger.info(
        `CompanyProjectService.addUserToProject: Successfully added UserID=${userId} to ProjectID=${projectId} with ProjectUserID=${projectUser.ProjectUserID}`,
      );

      return { error: null, data: projectUser };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.addUserToProject: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }
}

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { CompanyRepoService } from '../repo/company-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import { ProjectUserRepoService } from '../repo/project-user-repo.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectUserRole } from '../common/constants/entity.constants';
import { Company } from '../repo/entities/company.entity';
import { Project } from '../repo/entities/project.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { User } from '../repo/entities/user.entity';
import { ResultWithError } from '../common/interfaces/index';

@Injectable()
export class CompanyProjectService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private companyRepoService: CompanyRepoService,
    private projectRepoService: ProjectRepoService,
    private userRepoService: UserRepoService,
    private projectUserRepoService: ProjectUserRepoService,
  ) {}

  async createCompany(dto: CreateCompanyDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.createCompany: Creating company with name=${dto.name}`,
      );

      const company = await Promisify<Company>(
        this.companyRepoService.create({
          Name: dto.name,
          Slug: dto.slug,
        }),
      );

      this.logger.info(
        `CompanyProjectService.createCompany: Successfully created company with CompanyID=${company.CompanyID}`,
      );

      return { error: null, data: company };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.createCompany: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getAllCompanies(): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getAllCompanies: Fetching all companies`,
      );

      const companies = await Promisify<Company[]>(
        this.companyRepoService.getAll({}, false),
      );

      this.logger.info(
        `CompanyProjectService.getAllCompanies: Found ${companies.length} companies`,
      );

      return { error: null, data: companies };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getAllCompanies: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async getCompanyById(companyId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getCompanyById: Fetching company with CompanyID=${companyId}`,
      );

      const company = await Promisify<Company>(
        this.companyRepoService.get({ where: { CompanyID: companyId } }, true),
      );

      this.logger.info(
        `CompanyProjectService.getCompanyById: Successfully fetched company with CompanyID=${companyId}`,
      );

      return { error: null, data: company };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.getCompanyById: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async updateCompany(
    companyId: number,
    dto: UpdateCompanyDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.updateCompany: Updating company with CompanyID=${companyId}`,
      );

      // Ensure company exists
      await Promisify<Company>(
        this.companyRepoService.get({ where: { CompanyID: companyId } }, true),
      );

      const updatedCompany = await Promisify<Company>(
        this.companyRepoService.update(
          { CompanyID: companyId },
          {
            ...(dto.name && { Name: dto.name }),
            ...(dto.slug && { Slug: dto.slug }),
          },
        ),
      );

      this.logger.info(
        `CompanyProjectService.updateCompany: Successfully updated company with CompanyID=${companyId}`,
      );

      return { error: null, data: updatedCompany };
    } catch (error) {
      this.logger.error(
        `CompanyProjectService.updateCompany: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async createProject(
    companyId: number,
    dto: CreateProjectDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.createProject: Creating project for CompanyID=${companyId}, name=${dto.name}`,
      );

      // Ensure company exists
      await Promisify<Company>(
        this.companyRepoService.get({ where: { CompanyID: companyId } }, true),
      );

      const project = await Promisify<Project>(
        this.projectRepoService.create({
          CompanyID: companyId,
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

  async getProjectsByCompanyId(companyId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CompanyProjectService.getProjectsByCompanyId: Fetching projects for CompanyID=${companyId}`,
      );

      // Ensure company exists
      await Promisify<Company>(
        this.companyRepoService.get({ where: { CompanyID: companyId } }, true),
      );

      const projects = await Promisify<Project[]>(
        this.projectRepoService.getAll(
          { where: { CompanyID: companyId } },
          false,
        ),
      );

      this.logger.info(
        `CompanyProjectService.getProjectsByCompanyId: Found ${projects.length} projects for CompanyID=${companyId}`,
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

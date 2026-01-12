import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { Company } from '../repo/entities/company.entity';
import { Project } from '../repo/entities/project.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { CompanyProjectService } from './company-project.service';
import { AddUserToProjectDto } from './dto/add-user-to-project.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('company-project')
@ApiTags('Company & Project Management')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class CompanyProjectController {
  constructor(private companyProjectService: CompanyProjectService) {}

  // ========== Companies ==========

  @Post('companies')
  @ApiOperation({ summary: 'Create a new company' })
  @ApiOkResponseGeneric({
    type: Company,
    description: 'Company created successfully',
  })
  async createCompany(
    @Body() createCompanyDto: CreateCompanyDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Company created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const company = await Promisify<Company>(
        this.companyProjectService.createCompany(createCompanyDto),
      );
      resData = company;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create company : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get all companies' })
  @ApiOkResponseGeneric({
    type: Company,
    isArray: true,
    description: 'Companies fetched successfully',
  })
  async getAllCompanies(@Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Companies fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const companies = await Promisify<Company[]>(
        this.companyProjectService.getAllCompanies(),
      );
      resData = companies;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch companies : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('companies/:companyId')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiOkResponseGeneric({
    type: Company,
    description: 'Company fetched successfully',
  })
  async getCompanyById(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Company fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const company = await Promisify<Company>(
        this.companyProjectService.getCompanyById(companyId),
      );
      resData = company;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch company : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch('companies/:companyId')
  @ApiOperation({ summary: 'Update company' })
  @ApiOkResponseGeneric({
    type: Company,
    description: 'Company updated successfully',
  })
  async updateCompany(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Company updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const company = await Promisify<Company>(
        this.companyProjectService.updateCompany(companyId, updateCompanyDto),
      );
      resData = company;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update company : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  // ========== Projects ==========

  @Post('companies/:companyId/projects')
  @ApiOperation({ summary: 'Create a new project for a company' })
  @ApiOkResponseGeneric({
    type: Project,
    description: 'Project created successfully',
  })
  async createProject(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() createProjectDto: CreateProjectDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Project created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const project = await Promisify<Project>(
        this.companyProjectService.createProject(companyId, createProjectDto),
      );
      resData = project;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('companies/:companyId/projects')
  @ApiOperation({ summary: 'Get all projects for a company' })
  @ApiOkResponseGeneric({
    type: Project,
    isArray: true,
    description: 'Projects fetched successfully',
  })
  async getProjectsByCompanyId(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Projects fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const projects = await Promisify<Project[]>(
        this.companyProjectService.getProjectsByCompanyId(companyId),
      );
      resData = projects;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch projects : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiOkResponseGeneric({
    type: Project,
    description: 'Project fetched successfully',
  })
  async getProjectById(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Project fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const project = await Promisify<Project>(
        this.companyProjectService.getProjectById(projectId),
      );
      resData = project;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch('projects/:projectId')
  @ApiOperation({ summary: 'Update project' })
  @ApiOkResponseGeneric({
    type: Project,
    description: 'Project updated successfully',
  })
  async updateProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Project updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const project = await Promisify<Project>(
        this.companyProjectService.updateProject(projectId, updateProjectDto),
      );
      resData = project;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  // ========== Project Users ==========

  @Post('projects/:projectId/users/:userId')
  @ApiOperation({ summary: 'Add user to project' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'User added to project successfully',
  })
  async addUserToProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() addUserDto: AddUserToProjectDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'User added to project successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify<ProjectUser>(
        this.companyProjectService.addUserToProject(
          projectId,
          userId,
          addUserDto.projectRole,
        ),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to add user to project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete('projects/:projectId/users/:userId')
  @ApiOperation({ summary: 'Remove user from project' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'User removed from project successfully',
  })
  async removeUserFromProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'User removed from project successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify<{ removed: boolean }>(
        this.companyProjectService.removeUserFromProject(projectId, userId),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to remove user from project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('projects/:projectId/users')
  @ApiOperation({ summary: 'Get all users in a project' })
  @ApiOkResponseGeneric({
    type: ProjectUser,
    isArray: true,
    description: 'Project users fetched successfully',
  })
  async getProjectUsers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Project users fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const projectUsers = await Promisify<ProjectUser[]>(
        this.companyProjectService.getProjectUsers(projectId),
      );
      resData = projectUsers;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch project users : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

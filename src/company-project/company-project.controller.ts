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
import { Client } from '../repo/entities/client.entity';
import { Project } from '../repo/entities/project.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { CompanyProjectService } from './company-project.service';
import { AddUserToProjectDto } from './dto/add-user-to-project.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('company-project')
@ApiTags('Company & Project Management')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class CompanyProjectController {
  constructor(private companyProjectService: CompanyProjectService) {}

  // ========== Clients ==========

  @Post('clients')
  @ApiOperation({ summary: 'Create a new client' })
  @ApiOkResponseGeneric({
    type: Client,
    description: 'Client created successfully',
  })
  async createClient(
    @Body() createClientDto: CreateClientDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Client created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const client = await Promisify<Client>(
        this.companyProjectService.createClient(createClientDto),
      );
      resData = client;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create client : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get all clients' })
  @ApiOkResponseGeneric({
    type: Client,
    isArray: true,
    description: 'Clients fetched successfully',
  })
  async getAllClients(@Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Clients fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const clients = await Promisify<Client[]>(
        this.companyProjectService.getAllClients(),
      );
      resData = clients;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch clients : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('clients/:clientId')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiOkResponseGeneric({
    type: Client,
    description: 'Client fetched successfully',
  })
  async getClientById(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Client fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const client = await Promisify<Client>(
        this.companyProjectService.getClientById(clientId),
      );
      resData = client;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch client : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch('clients/:clientId')
  @ApiOperation({ summary: 'Update client' })
  @ApiOkResponseGeneric({
    type: Client,
    description: 'Client updated successfully',
  })
  async updateClient(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Body() updateClientDto: UpdateClientDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Client updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const client = await Promisify<Client>(
        this.companyProjectService.updateClient(clientId, updateClientDto),
      );
      resData = client;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update client : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  // ========== Projects ==========

  @Post('clients/:clientId/projects')
  @ApiOperation({ summary: 'Create a new project for a client' })
  @ApiOkResponseGeneric({
    type: Project,
    description: 'Project created successfully',
  })
  async createProject(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Body() createProjectDto: CreateProjectDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Project created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const project = await Promisify<Project>(
        this.companyProjectService.createProject(clientId, createProjectDto),
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

  @Get('clients/:clientId/projects')
  @ApiOperation({ summary: 'Get all projects for a client' })
  @ApiOkResponseGeneric({
    type: Project,
    isArray: true,
    description: 'Projects fetched successfully',
  })
  async getProjectsByClientId(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Projects fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const projects = await Promisify<Project[]>(
        this.companyProjectService.getProjectsByClientId(clientId),
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

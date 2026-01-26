import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
import { Module } from '../repo/entities/module.entity';
import { ModuleRun } from '../repo/entities/module-run.entity';
import { ModuleRunnerService } from './module-runner.service';
import { RegisterModuleDto } from './dto/register-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import {
  CreateModuleRunDto,
  CreateProjectLevelModuleRunDto,
} from './dto/create-module-run.dto';
import { ListModuleRunsQueryDto } from './dto/list-module-runs-query.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';

@Controller('modules')
@ApiTags('Modules')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ModulesController {
  constructor(private moduleRunnerService: ModuleRunnerService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new module' })
  @ApiOkResponseGeneric({
    type: Module,
    description: 'Module registered successfully',
  })
  async registerModule(
    @Body() registerModuleDto: RegisterModuleDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Module registered successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const module = await Promisify<Module>(
        this.moduleRunnerService.registerModule(registerModuleDto),
      );
      resData = module;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to register module : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get()
  @ApiOperation({ summary: 'List all modules with optional filters' })
  @ApiOkResponseGeneric({
    type: Module,
    isArray: true,
    description: 'Modules fetched successfully',
  })
  async listModules(@Query() query: ListModulesQueryDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Modules fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const modules = await Promisify<Module[]>(
        this.moduleRunnerService.listModules(query),
      );
      resData = modules;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch modules : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch(':moduleId')
  @ApiOperation({ summary: 'Update module' })
  @ApiOkResponseGeneric({
    type: Module,
    description: 'Module updated successfully',
  })
  async updateModule(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() updateModuleDto: UpdateModuleDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Module updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const module = await Promisify<Module>(
        this.moduleRunnerService.updateModule(moduleId, updateModuleDto),
      );
      resData = module;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update module : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

@Controller('projects')
@ApiTags('ModuleRuns')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ModuleRunsProjectController {
  constructor(private moduleRunnerService: ModuleRunnerService) {}

  /**
   * Create a PROJECT_LEVEL module run (no PersonID).
   * Only accepts modules with Scope = PROJECT_LEVEL.
   */
  @Post(':projectId/modules/run')
  @ApiOperation({
    summary: 'Create a PROJECT_LEVEL module run',
    description:
      'Creates a module run for PROJECT_LEVEL modules. PersonID will be null.',
  })
  @ApiOkResponseGeneric({
    type: ModuleRun,
    description: 'Project-level module run created successfully',
  })
  async createProjectLevelModuleRun(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createModuleRunDto: CreateProjectLevelModuleRunDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Project-level module run created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const moduleRun = await Promisify<ModuleRun>(
        this.moduleRunnerService.createProjectLevelModuleRun(
          projectId,
          createModuleRunDto,
        ),
      );
      resData = moduleRun;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create project-level module run : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post(':projectId/persons/:personId/runs')
  @ApiOperation({ summary: 'Create a new module run' })
  @ApiOkResponseGeneric({
    type: ModuleRun,
    description: 'Module run created successfully',
  })
  async createModuleRun(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Body() createModuleRunDto: CreateModuleRunDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Module run created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const moduleRun = await Promisify<ModuleRun>(
        this.moduleRunnerService.createModuleRun(
          projectId,
          personId,
          createModuleRunDto,
        ),
      );
      resData = moduleRun;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create module run : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':projectId/persons/:personId/runs')
  @ApiOperation({ summary: 'List module runs for a person in a project' })
  @ApiOkResponseGeneric({
    type: ModuleRun,
    isArray: true,
    description: 'Module runs fetched successfully',
  })
  async listModuleRuns(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Query() query: ListModuleRunsQueryDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Module runs fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const moduleRuns = await Promisify<ModuleRun[]>(
        this.moduleRunnerService.listModuleRuns(projectId, personId, query),
      );
      resData = moduleRuns;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch module runs : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

@Controller('runs')
@ApiTags('ModuleRuns')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ModuleRunsController {
  constructor(private moduleRunnerService: ModuleRunnerService) {}

  @Get(':runId')
  @ApiOperation({ summary: 'Get module run by ID' })
  @ApiOkResponseGeneric({
    type: ModuleRun,
    description: 'Module run fetched successfully',
  })
  async getModuleRunById(
    @Param('runId', ParseIntPipe) runId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Module run fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const moduleRun = await Promisify<ModuleRun>(
        this.moduleRunnerService.getModuleRunById(runId),
      );
      resData = moduleRun;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch module run : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

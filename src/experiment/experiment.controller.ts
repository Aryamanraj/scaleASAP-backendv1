import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceAccessGuard } from '../workspace/guards/workspace-access.guard';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { ExperimentService } from './experiment.service';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { CreateExperimentsBatchDto } from './dto/create-experiments-batch.dto';
import { UpdateExperimentDto } from './dto/update-experiment.dto';
import { Experiment } from '../repo/entities/experiment.entity';

@Controller()
@ApiTags('Experiments')
@ApiBearerAuth('Supabase-auth')
@UseGuards(SupabaseAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ExperimentController {
  constructor(private experimentService: ExperimentService) {}

  @Get('workspaces/:id/experiments')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get all experiments for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: Experiment,
    isArray: true,
    description: 'Experiments fetched successfully',
  })
  async getExperiments(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Experiments fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const experiments = await Promisify<Experiment[]>(
        this.experimentService.getExperimentsForWorkspace(workspaceId),
      );
      resData = experiments;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch experiments: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('workspaces/:id/experiments')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Create a single experiment for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: Experiment,
    description: 'Experiment created successfully',
  })
  async createExperiment(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Body() dto: CreateExperimentDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Experiment created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const experiment = await Promisify<Experiment>(
        this.experimentService.createExperiment(workspaceId, dto),
      );
      resData = experiment;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create experiment: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('experiments/batch')
  @ApiOperation({ summary: 'Create multiple experiments in batch' })
  @ApiOkResponseGeneric({
    type: Experiment,
    isArray: true,
    description: 'Experiments created successfully',
  })
  async createExperimentsBatch(
    @Body() dto: CreateExperimentsBatchDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Experiments created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const experiments = await Promisify<Experiment[]>(
        this.experimentService.createExperimentsBatch(dto),
      );
      resData = experiments;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create experiments: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('experiments/:id')
  @ApiOperation({ summary: 'Get an experiment by ID' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiOkResponseGeneric({
    type: Experiment,
    description: 'Experiment fetched successfully',
  })
  async getExperimentById(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Experiment fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const experiment = await Promisify<Experiment>(
        this.experimentService.getExperimentById(id),
      );
      resData = experiment;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch experiment: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Put('experiments/:id')
  @ApiOperation({ summary: 'Update an experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  @ApiOkResponseGeneric({
    type: Experiment,
    description: 'Experiment updated successfully',
  })
  async updateExperiment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExperimentDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Experiment updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const experiment = await Promisify<Experiment>(
        this.experimentService.updateExperiment(id, dto),
      );
      resData = experiment;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update experiment: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete('experiments/:id')
  @ApiOperation({ summary: 'Delete an experiment' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  async deleteExperiment(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Experiment deleted successfully';
    let resData = null;
    let resSuccess = true;

    try {
      await Promisify(this.experimentService.deleteExperiment(id));
      resData = { success: true };
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to delete experiment: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

/**
 * Async Job Controller
 * REST endpoints for job management.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { AsyncJobType } from '../common/constants/entity.constants';
import {
  AsyncJobListItem,
  AsyncJobService,
  AsyncJobStatusData,
} from './async-job.service';
import {
  AsyncJobResponseDto,
  CreateJobDto,
} from './dto/async-job-response.dto';

@Controller('jobs')
@ApiTags('Async Jobs')
@ApiBearerAuth('Api-auth')
@UseGuards(SupabaseAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class AsyncJobController {
  constructor(private asyncJobService: AsyncJobService) {}

  @Get(':jobId')
  @ApiOperation({ summary: 'Get job status' })
  @ApiOkResponseGeneric({
    type: AsyncJobResponseDto,
    description: 'Get job status from Redis',
  })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiQuery({ name: 'jobType', enum: AsyncJobType, required: true })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @Query('jobType') jobType: AsyncJobType,
    @Res() res: Response,
  ) {
    const result = await Promisify<AsyncJobStatusData>(
      this.asyncJobService.getJobStatus(jobId, jobType),
    );
    return makeResponse(
      res,
      200,
      true,
      'Job status retrieved',
      this.asyncJobService.toResponseDto(result),
    );
  }

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'List jobs for a workspace' })
  @ApiOkResponseGeneric({
    type: AsyncJobResponseDto,
    isArray: true,
    description: 'List workspace jobs from Redis',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace/Project ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  async getWorkspaceJobs(
    @Param('workspaceId') workspaceId: number,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const result = await Promisify<AsyncJobListItem[]>(
      this.asyncJobService.getJobsForProject(workspaceId, status),
    );
    const mapped = result.map((j) => this.asyncJobService.toResponseDto(j));
    return makeResponse(res, 200, true, 'Jobs retrieved', mapped);
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiQuery({ name: 'jobType', enum: AsyncJobType, required: true })
  async cancelJob(
    @Param('jobId') jobId: string,
    @Query('jobType') jobType: AsyncJobType,
    @Res() res: Response,
  ) {
    const result = await Promisify<boolean>(
      this.asyncJobService.cancelJob(jobId, jobType),
    );
    return makeResponse(res, 200, true, 'Job cancelled', { cancelled: result });
  }
}

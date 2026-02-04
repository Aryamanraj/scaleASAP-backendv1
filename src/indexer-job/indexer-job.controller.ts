import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { CreateIndexerFlowDto } from './dto/create-indexer-flow.dto';
import {
  FlowRunCreateResult,
  FlowRunStatusResult,
  IndexerJobService,
} from './indexer-job.service';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Controller('indexer')
@ApiTags('Indexer')
@ApiBearerAuth('Supabase-auth')
@UseGuards(CompositeAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class IndexerJobController {
  constructor(private indexerJobService: IndexerJobService) {}

  @Post('flows')
  @ApiOperation({ summary: 'Create an indexer flow run' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Flow run created successfully',
  })
  async createFlowRun(@Body() dto: CreateIndexerFlowDto, @Res() res: Response) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Flow run created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify<FlowRunCreateResult>(
        this.indexerJobService.createFlowRun(dto),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create flow run: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('flows/:flowRunId')
  @ApiOperation({ summary: 'Get indexer flow status' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Flow run status retrieved successfully',
  })
  async getFlowRunStatus(
    @Param('flowRunId', ParseIntPipe) flowRunId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Flow run status retrieved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify<FlowRunStatusResult>(
        this.indexerJobService.getFlowRunStatus(flowRunId),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch flow run status: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

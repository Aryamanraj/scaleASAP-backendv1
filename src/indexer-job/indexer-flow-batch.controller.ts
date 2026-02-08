import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { OptionalUserId } from '../common/decorators/userId-optional.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { CreateIndexerFlowsDto } from './dto/create-indexer-flows.dto';
import { QueryFlowSetDto } from './dto/query-flow-set.dto';
import {
  IndexerFlowBatchResultItem,
  IndexerFlowSetResult,
  IndexerFlowBatchService,
} from './indexer-flow-batch.service';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Controller('indexer')
@ApiTags('Indexer')
@ApiBearerAuth('Api-auth')
@UseGuards(CompositeAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class IndexerFlowBatchController {
  constructor(private indexerFlowBatchService: IndexerFlowBatchService) {}

  @Post('flows/batch')
  @ApiOperation({ summary: 'Create indexer flows for a list of profiles' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Batch flow runs created successfully',
  })
  async createBatch(
    @OptionalUserId() userId: number,
    @Body() dto: CreateIndexerFlowsDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Batch flow runs created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const triggeredByUserId = userId || dto.triggeredByUserId;
      if (!triggeredByUserId) {
        throw new Error('triggeredByUserId is required for admin requests');
      }

      const result = await Promisify<IndexerFlowSetResult>(
        this.indexerFlowBatchService.createFlows({
          ...dto,
          triggeredByUserId,
        }),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create batch flows: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('flows/batch/status/:flowSetId')
  @ApiOperation({ summary: 'Get batch flow status by flowSetId' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Batch flow status retrieved successfully',
  })
  async getBatchStatus(
    @Param('flowSetId') flowSetId: string,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Batch flow status retrieved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      if (!flowSetId) {
        throw new Error('flowSetId is required');
      }

      const result = await Promisify<any>(
        this.indexerFlowBatchService.getFlowSetStatus(flowSetId),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch batch flow status: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('flows/batch/query')
  @ApiOperation({ summary: 'Query composed flow results with AI' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Flow set query answered successfully',
  })
  async queryFlowSet(@Body() dto: QueryFlowSetDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Flow set query answered successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify<any>(
        this.indexerFlowBatchService.queryFlowSet(dto),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to query flow set: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

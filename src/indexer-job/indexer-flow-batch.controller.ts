import {
  Body,
  Controller,
  HttpStatus,
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
import {
  IndexerFlowBatchResultItem,
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

      const result = await Promisify<IndexerFlowBatchResultItem[]>(
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
}

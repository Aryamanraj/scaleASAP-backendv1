import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { InsightsService } from './insights.service';
import { GetLayerSnapshotQueryDto } from './dto/get-layer-snapshot-query.dto';
import { ListClaimsQueryDto } from './dto/list-claims-query.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { ClaimsPageDto } from './dto/claims-page.dto';
import { DocumentsPageDto } from './dto/documents-page.dto';
import { LayerInfoDto } from './dto/layer-info.dto';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { LayerSnapshot } from '../repo/entities/layer-snapshot.entity';

@ApiTags('Insights')
@ApiBearerAuth('Api-auth')
@Controller('projects')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get(':projectId/persons/:personId/layers/:layerNumber')
  @ApiOperation({
    summary: 'Get layer snapshot',
    description:
      'Retrieve a specific or latest layer snapshot for a person in a project',
  })
  @ApiOkResponseGeneric({
    type: LayerSnapshot,
    description: 'Layer snapshot retrieved successfully',
  })
  async getLayerSnapshot(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Param('layerNumber', ParseIntPipe) layerNumber: number,
    @Query() query: GetLayerSnapshotQueryDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Layer snapshot retrieved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const snapshot = await Promisify<LayerSnapshot>(
        this.insightsService.getLayerSnapshot(
          projectId,
          personId,
          layerNumber,
          query.version,
        ),
      );
      resData = snapshot;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = error?.message || 'Failed to retrieve layer snapshot';
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':projectId/persons/:personId/layers')
  @ApiOperation({
    summary: 'List available layers',
    description: 'Get all available layers with their latest snapshot versions',
  })
  @ApiOkResponseGeneric({
    type: LayerInfoDto,
    isArray: true,
    description: 'Layers retrieved successfully',
  })
  async listLayers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Layers retrieved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const layers = await Promisify<LayerInfoDto[]>(
        this.insightsService.listLayers(projectId, personId),
      );
      resData = layers;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = error?.message || 'Failed to retrieve layers';
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':projectId/persons/:personId/claims')
  @ApiOperation({
    summary: 'List claims',
    description: 'Get claims for a person in a project with optional filtering',
  })
  @ApiOkResponseGeneric({
    type: ClaimsPageDto,
    description: 'Claims retrieved successfully',
  })
  async listClaims(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Query() query: ListClaimsQueryDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Claims retrieved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const claimsPage = await Promisify<ClaimsPageDto>(
        this.insightsService.listClaims(projectId, personId, query),
      );
      resData = claimsPage;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = error?.message || 'Failed to retrieve claims';
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':projectId/persons/:personId/documents')
  @ApiOperation({
    summary: 'List documents',
    description:
      'Get documents for a person in a project with optional filtering',
  })
  @ApiOkResponseGeneric({
    type: DocumentsPageDto,
    description: 'Documents retrieved successfully',
  })
  async listDocuments(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Query() query: ListDocumentsQueryDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Documents retrieved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const documentsPage = await Promisify<DocumentsPageDto>(
        this.insightsService.listDocuments(projectId, personId, query),
      );
      resData = documentsPage;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = error?.message || 'Failed to retrieve documents';
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

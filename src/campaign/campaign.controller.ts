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
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceAccessGuard } from '../workspace/guards/workspace-access.guard';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CampaignActivity } from '../repo/entities/campaign-activity.entity';

@Controller()
@ApiTags('Campaigns')
@ApiBearerAuth('Supabase-auth')
@UseGuards(SupabaseAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  @Get('workspaces/:id/campaigns')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get all campaigns for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: CampaignResponseDto,
    isArray: true,
    description: 'Campaigns fetched successfully',
  })
  async getCampaigns(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Campaigns fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const campaigns = await Promisify<CampaignResponseDto[]>(
        this.campaignService.getCampaignsForWorkspace(workspaceId),
      );
      resData = campaigns;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch campaigns: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('workspaces/:id/campaigns')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: CampaignResponseDto,
    description: 'Campaign created successfully',
  })
  async createCampaign(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Body() dto: CreateCampaignDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Campaign created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const campaign = await Promisify<CampaignResponseDto>(
        this.campaignService.createCampaign(workspaceId, dto),
      );
      resData = campaign;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create campaign: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get a campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiOkResponseGeneric({
    type: CampaignResponseDto,
    description: 'Campaign fetched successfully',
  })
  async getCampaignById(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Campaign fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const campaign = await Promisify<CampaignResponseDto>(
        this.campaignService.getCampaignById(id),
      );
      resData = campaign;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch campaign: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiOkResponseGeneric({
    type: CampaignResponseDto,
    description: 'Campaign updated successfully',
  })
  async updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Campaign updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const campaign = await Promisify<CampaignResponseDto>(
        this.campaignService.updateCampaign(id, dto),
      );
      resData = campaign;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update campaign: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async deleteCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Campaign deleted successfully';
    let resData = null;
    let resSuccess = true;

    try {
      await Promisify(this.campaignService.deleteCampaign(id));
      resData = { success: true };
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to delete campaign: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('campaigns/:id/scale')
  @ApiOperation({ summary: 'Scale a campaign (add more leads)' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({
    name: 'targetCount',
    description: 'Target lead count',
    type: Number,
  })
  async scaleCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Query('targetCount', ParseIntPipe) targetCount: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.ACCEPTED;
    let resMessage = 'Campaign scaling initiated';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify(
        this.campaignService.scaleCampaign(id, targetCount),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to scale campaign: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('campaigns/:id/activities')
  @ApiOperation({ summary: 'Get activity feed for a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({
    name: 'limit',
    description: 'Number of activities to fetch',
    required: false,
  })
  @ApiOkResponseGeneric({
    type: CampaignActivity,
    isArray: true,
    description: 'Activities fetched successfully',
  })
  async getCampaignActivities(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Activities fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const activities = await Promisify<CampaignActivity[]>(
        this.campaignService.getCampaignActivities(id, limit || 50),
      );
      resData = activities;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch activities: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

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
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadsBatchDto } from './dto/create-leads-batch.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LogOutcomeDto } from './dto/log-outcome.dto';
import { CreateGeneratedMessageDto } from './dto/create-generated-message.dto';
import { GenerateOutreachDto } from './dto/generate-outreach.dto';
import { Lead } from '../repo/entities/lead.entity';
import { LeadSignal } from '../repo/entities/lead-signal.entity';
import { GeneratedMessage } from '../repo/entities/generated-message.entity';

@Controller()
@ApiTags('Leads')
@ApiBearerAuth('Supabase-auth')
@UseGuards(SupabaseAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class LeadController {
  constructor(private leadService: LeadService) {}

  @Get('campaigns/:id/leads')
  @ApiOperation({ summary: 'Get all leads for a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiOkResponseGeneric({
    type: Lead,
    isArray: true,
    description: 'Leads fetched successfully',
  })
  async getLeadsForCampaign(
    @Param('id', ParseIntPipe) campaignId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Leads fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const leads = await Promisify<Lead[]>(
        this.leadService.getLeadsForCampaign(campaignId),
      );
      resData = leads;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch leads: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('workspaces/:id/leads')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get all leads for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: Lead,
    isArray: true,
    description: 'Leads fetched successfully',
  })
  async getLeadsForWorkspace(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Leads fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const leads = await Promisify<Lead[]>(
        this.leadService.getLeadsForWorkspace(workspaceId),
      );
      resData = leads;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch leads: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('campaigns/:id/leads')
  @ApiOperation({ summary: 'Add a single lead to a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiOkResponseGeneric({
    type: Lead,
    description: 'Lead created successfully',
  })
  async createLead(
    @Param('id', ParseIntPipe) campaignId: number,
    @Body() dto: CreateLeadDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Lead created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const lead = await Promisify<Lead>(
        this.leadService.createLead(campaignId, dto),
      );
      resData = lead;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create lead: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('leads/batch')
  @ApiOperation({ summary: 'Add multiple leads to a campaign' })
  @ApiOkResponseGeneric({
    type: Lead,
    isArray: true,
    description: 'Leads created successfully',
  })
  async createLeadsBatch(
    @Body() dto: CreateLeadsBatchDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Leads created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const leads = await Promisify<Lead[]>(
        this.leadService.createLeadsBatch(dto),
      );
      resData = leads;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create leads: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get a lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiOkResponseGeneric({
    type: Lead,
    description: 'Lead fetched successfully',
  })
  async getLeadById(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Lead fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const lead = await Promisify<Lead>(this.leadService.getLeadById(id));
      resData = lead;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch lead: ${error?.message ?? 'Unknown error'}`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Put('leads/:id')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiOkResponseGeneric({
    type: Lead,
    description: 'Lead updated successfully',
  })
  async updateLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Lead updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const lead = await Promisify<Lead>(this.leadService.updateLead(id, dto));
      resData = lead;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update lead: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('leads/:id/outcome')
  @ApiOperation({ summary: 'Log an outcome for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiOkResponseGeneric({
    type: Lead,
    description: 'Outcome logged successfully',
  })
  async logOutcome(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LogOutcomeDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Outcome logged successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const lead = await Promisify<Lead>(this.leadService.logOutcome(id, dto));
      resData = lead;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to log outcome: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('leads/:id/signals')
  @ApiOperation({ summary: 'Get signals for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiOkResponseGeneric({
    type: LeadSignal,
    isArray: true,
    description: 'Signals fetched successfully',
  })
  async getLeadSignals(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Signals fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const signals = await Promisify<LeadSignal[]>(
        this.leadService.getLeadSignals(id),
      );
      resData = signals;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch signals: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATED MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('leads/:id/messages')
  @ApiOperation({ summary: 'Get all generated messages for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiOkResponseGeneric({
    type: GeneratedMessage,
    isArray: true,
    description: 'Messages fetched successfully',
  })
  async getGeneratedMessages(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Messages fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const messages = await Promisify<GeneratedMessage[]>(
        this.leadService.getGeneratedMessages(id),
      );
      resData = messages;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch messages: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('leads/:id/messages')
  @ApiOperation({ summary: 'Save a generated message for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiOkResponseGeneric({
    type: GeneratedMessage,
    description: 'Message saved successfully',
  })
  async saveGeneratedMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateGeneratedMessageDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Message saved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const message = await Promisify<GeneratedMessage>(
        this.leadService.saveGeneratedMessage(id, dto),
      );
      resData = message;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to save message: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a generated message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  async deleteGeneratedMessage(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Message deleted successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify(
        this.leadService.deleteGeneratedMessage(id),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to delete message: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('leads/:id/generate-outreach')
  @ApiOperation({ summary: 'Generate AI outreach for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  async generateOutreach(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateOutreachDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Outreach generated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify(
        this.leadService.generateOutreach(id, dto),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to generate outreach: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

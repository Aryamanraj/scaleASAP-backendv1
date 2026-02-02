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
import { WorkspaceAccessGuard } from './guards/workspace-access.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../common/decorators/current-user.decorator';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { WorkspaceService } from './workspace.service';
import { WorldviewAIService } from '../ai/services/worldview-ai.service';
import { DiscoveryAIService } from '../ai/services/discovery-ai.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateDiscoveryChatDto } from './dto/update-discovery-chat.dto';
import { CreateDiscoveryFeedbackDto } from './dto/create-discovery-feedback.dto';
import { DiscoveryChatDto } from './dto/discovery-chat.dto';
import {
  GenerateWorldviewDto,
  WorldviewResponseDto,
} from './dto/generate-worldview.dto';
import {
  WorkspaceResponseDto,
  WorkspaceMemberDto,
  ChatMessageDto,
} from './dto/workspace-response.dto';

@Controller('workspaces')
@ApiTags('Workspaces')
@ApiBearerAuth('Supabase-auth')
@UseGuards(SupabaseAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class WorkspaceController {
  constructor(
    private workspaceService: WorkspaceService,
    private worldviewAIService: WorldviewAIService,
    private discoveryAIService: DiscoveryAIService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiOkResponseGeneric({
    type: WorkspaceResponseDto,
    isArray: true,
    description: 'Workspaces fetched successfully',
  })
  async getWorkspaces(
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Workspaces fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const workspaces = await Promisify<WorkspaceResponseDto[]>(
        this.workspaceService.getWorkspacesForUser(user.userId),
      );
      resData = workspaces;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch workspaces: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiOkResponseGeneric({
    type: WorkspaceResponseDto,
    description: 'Workspace created successfully',
  })
  async createWorkspace(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateWorkspaceDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Workspace created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const workspace = await Promisify<WorkspaceResponseDto>(
        this.workspaceService.createWorkspace(user.userId, dto),
      );
      resData = workspace;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create workspace: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':id')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get a workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: WorkspaceResponseDto,
    description: 'Workspace fetched successfully',
  })
  async getWorkspaceById(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Workspace fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const workspace = await Promisify<WorkspaceResponseDto>(
        this.workspaceService.getWorkspaceById(id),
      );
      resData = workspace;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch workspace: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Put(':id')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Update a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: WorkspaceResponseDto,
    description: 'Workspace updated successfully',
  })
  async updateWorkspace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkspaceDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Workspace updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const workspace = await Promisify<WorkspaceResponseDto>(
        this.workspaceService.updateWorkspace(id, dto),
      );
      resData = workspace;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update workspace: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete(':id')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Delete a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async deleteWorkspace(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Workspace deleted successfully';
    let resData = null;
    let resSuccess = true;

    try {
      await Promisify(this.workspaceService.deleteWorkspace(id));
      resData = { success: true };
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to delete workspace: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':id/discovery-chat')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get discovery chat history for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: ChatMessageDto,
    isArray: true,
    description: 'Chat history fetched successfully',
  })
  async getDiscoveryChatHistory(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Chat history fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const history = await Promisify<ChatMessageDto[]>(
        this.workspaceService.getDiscoveryChatHistory(id),
      );
      resData = history;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch chat history: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Put(':id/discovery-chat')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Update discovery chat history for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async updateDiscoveryChatHistory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDiscoveryChatDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Chat history updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      await Promisify(
        this.workspaceService.updateDiscoveryChatHistory(id, dto),
      );
      resData = { success: true };
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update chat history: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post(':id/discovery-feedback')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Submit discovery feedback for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async saveDiscoveryFeedback(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateDiscoveryFeedbackDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Feedback saved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      await Promisify(
        this.workspaceService.saveDiscoveryFeedback(id, user.userId, dto),
      );
      resData = { success: true };
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to save feedback: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':id/members')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get all members of a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: WorkspaceMemberDto,
    isArray: true,
    description: 'Members fetched successfully',
  })
  async getMembers(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Members fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const members = await Promisify<WorkspaceMemberDto[]>(
        this.workspaceService.getWorkspaceMembers(id),
      );
      resData = members;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch members: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post(':id/members')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Add a member to a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: WorkspaceMemberDto,
    description: 'Member added successfully',
  })
  async addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMemberDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Member added successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const member = await Promisify<WorkspaceMemberDto>(
        this.workspaceService.addMember(id, dto),
      );
      resData = member;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to add member: ${error?.message ?? 'Unknown error'}`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete(':id/members/:userId')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Remove a member from a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Member removed successfully';
    let resData = null;
    let resSuccess = true;

    try {
      await Promisify(this.workspaceService.removeMember(id, userId));
      resData = { success: true };
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to remove member: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post(':id/worldview/generate')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Generate worldview document from onboarding data' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: WorldviewResponseDto,
    description: 'Worldview generated successfully',
  })
  async generateWorldview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateWorldviewDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Worldview generated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await this.worldviewAIService.generateWorldview({
        onboardingData: dto.onboardingData,
        websiteScrape: dto.websiteScrape,
      });
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to generate worldview: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post(':id/discovery/chat')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Stream discovery chat response' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  async discoveryChat(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DiscoveryChatDto,
    @Res() res: Response,
  ) {
    try {
      // Get workspace data for context
      const workspace = await Promisify<WorkspaceResponseDto>(
        this.workspaceService.getWorkspaceById(id),
      );

      // Get onboarding data from workspace settings or separate storage
      const onboardingData =
        (workspace.settings as Record<string, unknown>) || {};

      // Map previousExperiments to required format with defaults
      const mappedExperiments = (dto.previousExperiments || []).map((exp) => ({
        name: exp.name,
        type: exp.type || 'unknown',
        pattern: exp.pattern || '',
        industries: exp.industries || [],
        status: exp.status || 'active',
      }));

      // Build context for the AI
      const context = {
        userName: dto.userName || workspace.name || 'User',
        companyName:
          (onboardingData.companyName as string) ||
          workspace.name ||
          'the company',
        worldview: (onboardingData.worldview_full as string) || '',
        website: (onboardingData.website_scrape as string) || '',
        turnCount: dto.messages?.length || 0,
        isFollowUp: dto.isFollowUp || false,
        previousExperiments: mappedExperiments,
      };

      // Get the last user message
      const userMessages = dto.messages.filter((m) => m.role === 'user');
      const lastUserMessage =
        userMessages[userMessages.length - 1]?.content ||
        'Hi, I am ready to start the discovery process.';

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Stream the response
      const stream = this.discoveryAIService.chatStream(
        context,
        dto.messages.slice(0, -1), // All messages except last
        lastUserMessage,
      );

      let fullResponse = '';
      let experiments = null;

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          fullResponse += chunk;
          res.write(
            `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`,
          );
        }
      }

      // Parse experiments from response
      const { parseExperimentsFromResponse } = await import(
        '../ai/prompts/discovery/orchestrator'
      );
      experiments = parseExperimentsFromResponse(fullResponse);

      // Send completion event with experiments if found
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          experiments: experiments || null,
        })}\n\n`,
      );

      res.end();
    } catch (error) {
      // Send error via SSE
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          message: error?.message ?? 'Unknown error',
        })}\n\n`,
      );
      res.end();
    }
  }
}

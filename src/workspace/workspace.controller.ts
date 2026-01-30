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
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateDiscoveryChatDto } from './dto/update-discovery-chat.dto';
import { CreateDiscoveryFeedbackDto } from './dto/create-discovery-feedback.dto';
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
  constructor(private workspaceService: WorkspaceService) {}

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
}

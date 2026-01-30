import { Inject, Injectable, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { UserRepoService } from '../repo/user-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { ProjectUserRepoService } from '../repo/project-user-repo.service';
import { DiscoveryFeedbackRepoService } from '../repo/discovery-feedback-repo.service';
import { User } from '../repo/entities/user.entity';
import { Project } from '../repo/entities/project.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { DiscoveryFeedback } from '../repo/entities/discovery-feedback.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateDiscoveryChatDto } from './dto/update-discovery-chat.dto';
import { CreateDiscoveryFeedbackDto } from './dto/create-discovery-feedback.dto';
import {
  OnboardingStatus,
  ProjectUserRole,
  ProjectStatus,
} from '../common/constants/entity.constants';
import {
  WorkspaceResponseDto,
  WorkspaceMemberDto,
  ChatMessageDto,
} from './dto/workspace-response.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private userRepoService: UserRepoService,
    private projectRepoService: ProjectRepoService,
    private projectUserRepoService: ProjectUserRepoService,
    private discoveryFeedbackRepoService: DiscoveryFeedbackRepoService,
  ) {}

  /**
   * Get all workspaces the user has access to.
   * Uses ProjectUsers to determine membership.
   */
  async getWorkspacesForUser(userId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.getWorkspacesForUser: Getting workspaces [userId=${userId}]`,
      );

      // Get all project memberships for this user
      const projectUsers = await Promisify<ProjectUser[]>(
        this.projectUserRepoService.getAll(
          {
            where: { UserID: userId },
            relations: { Project: true },
          },
          false,
        ),
      );

      // Map to workspace response DTOs
      const workspaces = projectUsers
        .filter((pu) => pu.Project)
        .map((pu) => this.mapProjectToWorkspaceResponse(pu.Project));

      this.logger.info(
        `WorkspaceService.getWorkspacesForUser: Found ${workspaces.length} workspaces [userId=${userId}]`,
      );

      return { data: workspaces, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.getWorkspacesForUser: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get a single workspace by ID.
   * Caller should ensure user has access (via WorkspaceAccessGuard).
   */
  async getWorkspaceById(workspaceId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.getWorkspaceById: Getting workspace [workspaceId=${workspaceId}]`,
      );

      const project = await Promisify<Project>(
        this.projectRepoService.get(
          {
            where: { ProjectID: workspaceId },
            relations: { Owner: true },
          },
          true,
        ),
      );

      const response = this.mapProjectToWorkspaceResponse(project);

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.getWorkspaceById: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Create a new workspace.
   * Creates Project and ProjectUser (owner) records.
   */
  async createWorkspace(
    userId: number,
    dto: CreateWorkspaceDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.createWorkspace: Creating workspace [userId=${userId}, name=${dto.name}]`,
      );

      // Get user to access their ClientID
      const user = await Promisify<User>(
        this.userRepoService.get({ where: { UserID: userId } }, true),
      );

      // Create Project
      const project = await Promisify<Project>(
        this.projectRepoService.create({
          ClientID: user.ClientID,
          Name: dto.name,
          Website: dto.website,
          OwnerUserID: userId,
          OnboardingStatus: OnboardingStatus.INCOMPLETE,
          Status: ProjectStatus.ACTIVE,
        }),
      );

      // Create ProjectUser for owner
      await Promisify<ProjectUser>(
        this.projectUserRepoService.create({
          ProjectID: project.ProjectID,
          UserID: userId,
          ProjectRole: ProjectUserRole.OWNER,
        }),
      );

      const response = this.mapProjectToWorkspaceResponse(project);

      this.logger.info(
        `WorkspaceService.createWorkspace: Successfully created workspace [workspaceId=${project.ProjectID}]`,
      );

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.createWorkspace: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Update a workspace.
   */
  async updateWorkspace(
    workspaceId: number,
    dto: UpdateWorkspaceDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.updateWorkspace: Updating workspace [workspaceId=${workspaceId}]`,
      );

      // Build update data
      const updateData: Partial<Project> = {};
      if (dto.name !== undefined) updateData.Name = dto.name;
      if (dto.website !== undefined) updateData.Website = dto.website;
      if (dto.faviconUrl !== undefined) updateData.FaviconUrl = dto.faviconUrl;
      if (dto.status !== undefined) updateData.Status = dto.status;
      if (dto.onboardingStatus !== undefined)
        updateData.OnboardingStatus = dto.onboardingStatus;
      if (dto.settings !== undefined) updateData.Settings = dto.settings;

      await Promisify(
        this.projectRepoService.update({ ProjectID: workspaceId }, updateData),
      );

      // Fetch updated project
      const project = await Promisify<Project>(
        this.projectRepoService.get(
          { where: { ProjectID: workspaceId } },
          true,
        ),
      );

      const response = this.mapProjectToWorkspaceResponse(project);

      this.logger.info(
        `WorkspaceService.updateWorkspace: Successfully updated workspace [workspaceId=${workspaceId}]`,
      );

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.updateWorkspace: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Delete a workspace (soft delete by setting status).
   */
  async deleteWorkspace(workspaceId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.deleteWorkspace: Deleting workspace [workspaceId=${workspaceId}]`,
      );

      await Promisify(
        this.projectRepoService.update(
          { ProjectID: workspaceId },
          { Status: ProjectStatus.DELETED },
        ),
      );

      this.logger.info(
        `WorkspaceService.deleteWorkspace: Successfully deleted workspace [workspaceId=${workspaceId}]`,
      );

      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.deleteWorkspace: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get all members of a workspace.
   */
  async getWorkspaceMembers(workspaceId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.getWorkspaceMembers: Getting members [workspaceId=${workspaceId}]`,
      );

      const projectUsers = await Promisify<ProjectUser[]>(
        this.projectUserRepoService.getAll(
          {
            where: { ProjectID: workspaceId },
            relations: { User: true },
          },
          false,
        ),
      );

      const members: WorkspaceMemberDto[] = projectUsers
        .filter((pu) => pu.User)
        .map((pu) => ({
          userId: pu.User.UserID,
          name: pu.User.Name,
          email: pu.User.Email,
          role: pu.ProjectRole,
        }));

      this.logger.info(
        `WorkspaceService.getWorkspaceMembers: Found ${members.length} members [workspaceId=${workspaceId}]`,
      );

      return { data: members, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.getWorkspaceMembers: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Add a member to a workspace.
   */
  async addMember(
    workspaceId: number,
    dto: AddMemberDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.addMember: Adding member [workspaceId=${workspaceId}, email=${dto.email}]`,
      );

      // Find user by email
      const user = await Promisify<User>(
        this.userRepoService.get({ where: { Email: dto.email } }, false),
      );

      if (!user) {
        throw new GenericError(
          `User with email ${dto.email} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Check if already a member
      const existingMembership = await Promisify<ProjectUser>(
        this.projectUserRepoService.get(
          {
            where: {
              ProjectID: workspaceId,
              UserID: user.UserID,
            },
          },
          false,
        ),
      );

      if (existingMembership) {
        throw new GenericError(
          'User is already a member of this workspace',
          HttpStatus.CONFLICT,
        );
      }

      // Create project user
      const projectUser = await Promisify<ProjectUser>(
        this.projectUserRepoService.create({
          ProjectID: workspaceId,
          UserID: user.UserID,
          ProjectRole: dto.role,
        }),
      );

      this.logger.info(
        `WorkspaceService.addMember: Successfully added member [workspaceId=${workspaceId}, userId=${user.UserID}]`,
      );

      return {
        data: {
          userId: user.UserID,
          name: user.Name,
          email: user.Email,
          role: dto.role,
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`WorkspaceService.addMember: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Remove a member from a workspace.
   */
  async removeMember(
    workspaceId: number,
    userId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.removeMember: Removing member [workspaceId=${workspaceId}, userId=${userId}]`,
      );

      // Check if user is the owner
      const project = await Promisify<Project>(
        this.projectRepoService.get(
          { where: { ProjectID: workspaceId } },
          true,
        ),
      );

      if (project.OwnerUserID === userId) {
        throw new GenericError(
          'Cannot remove workspace owner',
          HttpStatus.FORBIDDEN,
        );
      }

      await Promisify(
        this.projectUserRepoService.delete({
          ProjectID: workspaceId,
          UserID: userId,
        }),
      );

      this.logger.info(
        `WorkspaceService.removeMember: Successfully removed member [workspaceId=${workspaceId}, userId=${userId}]`,
      );

      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.removeMember: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Helper to map Project entity to WorkspaceResponseDto.
   */
  private mapProjectToWorkspaceResponse(
    project: Project,
  ): WorkspaceResponseDto {
    return {
      id: project.ProjectID,
      name: project.Name,
      website: project.Website,
      faviconUrl: project.FaviconUrl,
      status: project.Status,
      onboardingStatus: project.OnboardingStatus,
      discoveryChatHistory: project.DiscoveryChatHistory as ChatMessageDto[],
      settings: project.Settings,
      ownerUserId: project.OwnerUserID,
      createdAt: project.CreatedAt,
      updatedAt: project.UpdatedAt,
    };
  }

  /**
   * Update discovery chat history for a workspace.
   */
  async updateDiscoveryChatHistory(
    workspaceId: number,
    dto: UpdateDiscoveryChatDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.updateDiscoveryChatHistory: Updating chat history [workspaceId=${workspaceId}]`,
      );

      await Promisify(
        this.projectRepoService.update(
          { ProjectID: workspaceId },
          { DiscoveryChatHistory: dto.history },
        ),
      );

      this.logger.info(
        `WorkspaceService.updateDiscoveryChatHistory: Successfully updated [workspaceId=${workspaceId}]`,
      );

      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.updateDiscoveryChatHistory: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get discovery chat history for a workspace.
   */
  async getDiscoveryChatHistory(workspaceId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.getDiscoveryChatHistory: Getting chat history [workspaceId=${workspaceId}]`,
      );

      const project = await Promisify<Project>(
        this.projectRepoService.get(
          { where: { ProjectID: workspaceId } },
          true,
        ),
      );

      return { data: project.DiscoveryChatHistory || [], error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.getDiscoveryChatHistory: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Save discovery feedback for a workspace.
   */
  async saveDiscoveryFeedback(
    workspaceId: number,
    userId: number,
    dto: CreateDiscoveryFeedbackDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `WorkspaceService.saveDiscoveryFeedback: Saving feedback [workspaceId=${workspaceId}, userId=${userId}]`,
      );

      const feedback = await Promisify<DiscoveryFeedback>(
        this.discoveryFeedbackRepoService.create({
          ProjectID: workspaceId,
          UserID: userId,
          Rating: dto.rating,
          Feedback: dto.feedback,
        }),
      );

      this.logger.info(
        `WorkspaceService.saveDiscoveryFeedback: Successfully saved [feedbackId=${feedback.DiscoveryFeedbackID}]`,
      );

      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `WorkspaceService.saveDiscoveryFeedback: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }
}

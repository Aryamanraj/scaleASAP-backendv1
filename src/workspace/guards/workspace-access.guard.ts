import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ProjectUserRepoService } from '../../repo/project-user-repo.service';
import { ProjectUser } from '../../repo/entities/project-user.entity';
import { Promisify } from '../../common/helpers/promisifier';
import { GenericError } from '../../common/errors/Generic.error';

/**
 * Guard that checks if the current user has access to the requested workspace.
 *
 * Expects:
 * - req.user (from SupabaseAuthGuard) with UserID
 * - req.params.id (workspace/project ID) or req.params.workspaceId
 */
@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private projectUserRepoService: ProjectUserRepoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId =
      request.params.id ||
      request.params.workspaceId ||
      request.body?.workspaceId;

    // If no workspace ID in request, let the handler decide
    if (!workspaceId) {
      return true;
    }

    if (!user?.UserID) {
      this.logger.warn('WorkspaceAccessGuard: No authenticated user found');
      throw new GenericError('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const projectId = parseInt(workspaceId, 10);
    if (isNaN(projectId)) {
      this.logger.warn(
        `WorkspaceAccessGuard: Invalid workspace ID [workspaceId=${workspaceId}]`,
      );
      throw new GenericError('Invalid workspace ID', HttpStatus.BAD_REQUEST);
    }

    this.logger.info(
      `WorkspaceAccessGuard: Checking access [userId=${user.UserID}, projectId=${projectId}]`,
    );

    try {
      // Check if user is a member of the project via ProjectUsers
      const projectUser = await Promisify<ProjectUser>(
        this.projectUserRepoService.get(
          {
            where: {
              ProjectID: projectId,
              UserID: user.UserID,
            },
          },
          false, // Don't panic if not found
        ),
      );

      if (!projectUser) {
        this.logger.warn(
          `WorkspaceAccessGuard: Access denied [userId=${user.UserID}, projectId=${projectId}]`,
        );
        throw new GenericError(
          'You do not have access to this workspace',
          HttpStatus.FORBIDDEN,
        );
      }

      // Attach project user info to request for use in handlers
      request.projectUser = projectUser;

      this.logger.info(
        `WorkspaceAccessGuard: Access granted [userId=${user.UserID}, projectId=${projectId}, role=${projectUser.ProjectRole}]`,
      );

      return true;
    } catch (error) {
      if (error instanceof GenericError) {
        throw error;
      }
      this.logger.error(`WorkspaceAccessGuard: Error - ${error.stack}`);
      throw new GenericError(
        'Error checking workspace access',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

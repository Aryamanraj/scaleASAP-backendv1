import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { OnboardingDataRepoService } from '../repo/onboarding-data-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { OnboardingData } from '../repo/entities/onboarding-data.entity';
import { Project } from '../repo/entities/project.entity';
import { UpsertOnboardingDataDto } from './dto/upsert-onboarding-data.dto';
import { OnboardingDataResponseDto } from './dto/onboarding-data-response.dto';
import { OnboardingStatus } from '../common/constants/entity.constants';

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private onboardingDataRepoService: OnboardingDataRepoService,
    private projectRepoService: ProjectRepoService,
  ) {}

  /**
   * Get onboarding data for a workspace.
   */
  async getOnboardingData(workspaceId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `OnboardingService.getOnboardingData: Getting data [workspaceId=${workspaceId}]`,
      );

      const onboardingData = await Promisify<OnboardingData>(
        this.onboardingDataRepoService.get(
          { where: { ProjectID: workspaceId } },
          false,
        ),
      );

      if (!onboardingData) {
        return { data: null, error: null };
      }

      const response = this.mapToResponse(onboardingData);
      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `OnboardingService.getOnboardingData: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Create or update onboarding data for a workspace.
   */
  async upsertOnboardingData(
    workspaceId: number,
    dto: UpsertOnboardingDataDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `OnboardingService.upsertOnboardingData: Upserting data [workspaceId=${workspaceId}]`,
      );

      // Check if onboarding data exists
      const existing = await Promisify<OnboardingData>(
        this.onboardingDataRepoService.get(
          { where: { ProjectID: workspaceId } },
          false,
        ),
      );

      let onboardingData: OnboardingData;

      if (existing) {
        // Update existing
        await Promisify(
          this.onboardingDataRepoService.update(
            { ProjectID: workspaceId },
            { Data: dto.data },
          ),
        );

        onboardingData = await Promisify<OnboardingData>(
          this.onboardingDataRepoService.get(
            { where: { ProjectID: workspaceId } },
            true,
          ),
        );
      } else {
        // Create new
        onboardingData = await Promisify<OnboardingData>(
          this.onboardingDataRepoService.create({
            ProjectID: workspaceId,
            Data: dto.data,
          }),
        );
      }

      // Update workspace onboarding status if requested
      if (dto.markComplete) {
        await Promisify(
          this.projectRepoService.update(
            { ProjectID: workspaceId },
            { OnboardingStatus: OnboardingStatus.COMPLETE },
          ),
        );
      }

      // Also sync basic info from onboarding data to workspace
      const data = dto.data as Record<string, unknown>;
      const updateWorkspace: Partial<Project> = {};

      if (data.companyName) updateWorkspace.Name = String(data.companyName);
      if (data.website) updateWorkspace.Website = String(data.website);
      if (data.favicon_url)
        updateWorkspace.FaviconUrl = String(data.favicon_url);

      if (Object.keys(updateWorkspace).length > 0) {
        await Promisify(
          this.projectRepoService.update(
            { ProjectID: workspaceId },
            updateWorkspace,
          ),
        );
      }

      const response = this.mapToResponse(onboardingData);

      this.logger.info(
        `OnboardingService.upsertOnboardingData: Successfully upserted [workspaceId=${workspaceId}]`,
      );

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `OnboardingService.upsertOnboardingData: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Helper to map entity to response DTO.
   */
  private mapToResponse(entity: OnboardingData): OnboardingDataResponseDto {
    return {
      id: entity.OnboardingDataID,
      workspaceId: entity.ProjectID,
      data: entity.Data,
      createdAt: entity.CreatedAt,
      updatedAt: entity.UpdatedAt,
    };
  }
}

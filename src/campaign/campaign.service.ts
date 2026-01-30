import { Inject, Injectable, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { CampaignRepoService } from '../repo/campaign-repo.service';
import { CampaignActivityRepoService } from '../repo/campaign-activity-repo.service';
import { ExperimentRepoService } from '../repo/experiment-repo.service';
import { LeadRepoService } from '../repo/lead-repo.service';
import { Campaign } from '../repo/entities/campaign.entity';
import { CampaignActivity } from '../repo/entities/campaign-activity.entity';
import { Experiment } from '../repo/entities/experiment.entity';
import { Lead } from '../repo/entities/lead.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import {
  CampaignResponseDto,
  CampaignStatsDto,
} from './dto/campaign-response.dto';
import {
  CampaignStatus,
  ActivityType,
  LeadStatus,
  LeadOutcome,
} from '../common/constants/entity.constants';

@Injectable()
export class CampaignService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private campaignRepoService: CampaignRepoService,
    private campaignActivityRepoService: CampaignActivityRepoService,
    private experimentRepoService: ExperimentRepoService,
    private leadRepoService: LeadRepoService,
  ) {}

  /**
   * Get all campaigns for a workspace.
   */
  async getCampaignsForWorkspace(
    workspaceId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.getCampaignsForWorkspace: Getting campaigns [workspaceId=${workspaceId}]`,
      );

      const campaigns = await Promisify<Campaign[]>(
        this.campaignRepoService.getAll(
          {
            where: { ProjectID: workspaceId },
            relations: { Experiment: true },
            order: { CreatedAt: 'DESC' },
          },
          false,
        ),
      );

      // Map to response DTOs with basic stats
      const responses: CampaignResponseDto[] = [];
      for (const campaign of campaigns) {
        const response = this.mapCampaignToResponse(campaign);
        // Add basic stats
        response.stats = await this.getCampaignStats(campaign.CampaignID);
        responses.push(response);
      }

      this.logger.info(
        `CampaignService.getCampaignsForWorkspace: Found ${responses.length} campaigns`,
      );

      return { data: responses, error: null };
    } catch (error) {
      this.logger.error(
        `CampaignService.getCampaignsForWorkspace: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get a single campaign by ID with full stats.
   */
  async getCampaignById(campaignId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.getCampaignById: Getting campaign [campaignId=${campaignId}]`,
      );

      const campaign = await Promisify<Campaign>(
        this.campaignRepoService.get(
          {
            where: { CampaignID: campaignId },
            relations: { Experiment: true, Project: true },
          },
          true,
        ),
      );

      const response = this.mapCampaignToResponse(campaign);
      response.stats = await this.getCampaignStats(campaignId);

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `CampaignService.getCampaignById: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Create a new campaign.
   */
  async createCampaign(
    workspaceId: number,
    dto: CreateCampaignDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.createCampaign: Creating campaign [workspaceId=${workspaceId}, name=${dto.name}]`,
      );

      // Verify experiment exists and belongs to workspace
      const experiment = await Promisify<Experiment>(
        this.experimentRepoService.get(
          { where: { ExperimentID: dto.experimentId } },
          true,
        ),
      );

      if (experiment.ProjectID !== workspaceId) {
        throw new GenericError(
          'Experiment does not belong to this workspace',
          HttpStatus.BAD_REQUEST,
        );
      }

      const campaign = await Promisify<Campaign>(
        this.campaignRepoService.create({
          ProjectID: workspaceId,
          ExperimentID: dto.experimentId,
          Name: dto.name,
          Settings: dto.settings,
          Status: CampaignStatus.ACTIVE,
        }),
      );

      // Log activity
      await this.logActivity(
        campaign.CampaignID,
        ActivityType.CAMPAIGN_CREATED,
        { name: dto.name },
      );

      const response = this.mapCampaignToResponse(campaign);

      this.logger.info(
        `CampaignService.createCampaign: Successfully created campaign [campaignId=${campaign.CampaignID}]`,
      );

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `CampaignService.createCampaign: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Update a campaign.
   */
  async updateCampaign(
    campaignId: number,
    dto: UpdateCampaignDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.updateCampaign: Updating campaign [campaignId=${campaignId}]`,
      );

      const updateData: Partial<Campaign> = {};
      if (dto.name !== undefined) updateData.Name = dto.name;
      if (dto.status !== undefined) updateData.Status = dto.status;
      if (dto.settings !== undefined) updateData.Settings = dto.settings;

      await Promisify(
        this.campaignRepoService.update({ CampaignID: campaignId }, updateData),
      );

      const campaign = await Promisify<Campaign>(
        this.campaignRepoService.get(
          { where: { CampaignID: campaignId } },
          true,
        ),
      );

      // Log activity if status changed (using generic campaign activity)
      if (dto.status !== undefined) {
        const activityType =
          dto.status === CampaignStatus.PAUSED
            ? ActivityType.CAMPAIGN_PAUSED
            : ActivityType.CAMPAIGN_RESUMED;
        await this.logActivity(campaignId, activityType, {
          newStatus: dto.status,
        });
      }

      const response = this.mapCampaignToResponse(campaign);

      this.logger.info(
        `CampaignService.updateCampaign: Successfully updated campaign [campaignId=${campaignId}]`,
      );

      return { data: response, error: null };
    } catch (error) {
      this.logger.error(
        `CampaignService.updateCampaign: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Delete a campaign (soft delete).
   */
  async deleteCampaign(campaignId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.deleteCampaign: Deleting campaign [campaignId=${campaignId}]`,
      );

      await Promisify(
        this.campaignRepoService.update(
          { CampaignID: campaignId },
          { Status: CampaignStatus.ARCHIVED },
        ),
      );

      this.logger.info(
        `CampaignService.deleteCampaign: Successfully deleted campaign [campaignId=${campaignId}]`,
      );

      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `CampaignService.deleteCampaign: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Scale a campaign (placeholder for Bull job).
   */
  async scaleCampaign(
    campaignId: number,
    targetLeadCount: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.scaleCampaign: Scaling campaign [campaignId=${campaignId}, targetLeadCount=${targetLeadCount}]`,
      );

      // Update status to active (scaling in progress)
      await Promisify(
        this.campaignRepoService.update(
          { CampaignID: campaignId },
          { Status: CampaignStatus.ACTIVE },
        ),
      );

      // Log activity
      await this.logActivity(campaignId, ActivityType.DISCOVERY_STARTED, {
        targetCount: targetLeadCount,
        message: 'Scaling initiated',
      });

      // TODO: Queue Bull job for actual scaling (Phase 6)

      this.logger.info(
        `CampaignService.scaleCampaign: Scaling initiated [campaignId=${campaignId}]`,
      );

      return {
        data: {
          success: true,
          message: 'Campaign scaling initiated',
          jobId: null, // Will be populated when Bull job is created
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(
        `CampaignService.scaleCampaign: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get activity feed for a campaign.
   */
  async getCampaignActivities(
    campaignId: number,
    limit = 50,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `CampaignService.getCampaignActivities: Getting activities [campaignId=${campaignId}]`,
      );

      const activities = await Promisify<CampaignActivity[]>(
        this.campaignActivityRepoService.getAll(
          {
            where: { CampaignID: campaignId },
            order: { CreatedAt: 'DESC' },
            take: limit,
          },
          false,
        ),
      );

      return { data: activities, error: null };
    } catch (error) {
      this.logger.error(
        `CampaignService.getCampaignActivities: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get workspace ID for a campaign (for access checking).
   */
  async getWorkspaceIdForCampaign(campaignId: number): Promise<number | null> {
    try {
      const campaign = await Promisify<Campaign>(
        this.campaignRepoService.get(
          { where: { CampaignID: campaignId } },
          false,
        ),
      );
      return campaign?.ProjectID || null;
    } catch {
      return null;
    }
  }

  /**
   * Log a campaign activity.
   */
  private async logActivity(
    campaignId: number,
    type: ActivityType,
    metadata: object,
  ): Promise<void> {
    try {
      await Promisify(
        this.campaignActivityRepoService.create({
          CampaignID: campaignId,
          ActivityType: type,
          Metadata: metadata,
        }),
      );
    } catch (error) {
      this.logger.error(`CampaignService.logActivity: Error - ${error.stack}`);
    }
  }

  /**
   * Calculate campaign statistics.
   */
  private async getCampaignStats(
    campaignId: number,
  ): Promise<CampaignStatsDto> {
    try {
      const leads = await Promisify<Lead[]>(
        this.leadRepoService.getAll(
          { where: { CampaignID: campaignId } },
          false,
        ),
      );

      const totalLeads = leads.length;
      const contacted = leads.filter(
        (l) => l.Status === LeadStatus.SENT,
      ).length;
      const responded = leads.filter(
        (l) =>
          l.Outcome === LeadOutcome.INTERESTED ||
          l.Outcome === LeadOutcome.MEETING_BOOKED ||
          l.Outcome === LeadOutcome.CLOSED_WON,
      ).length;
      const converted = leads.filter(
        (l) => l.Outcome === LeadOutcome.CLOSED_WON,
      ).length;

      return {
        totalLeads,
        contacted,
        responded,
        converted,
        responseRate: totalLeads > 0 ? (responded / totalLeads) * 100 : 0,
        conversionRate: totalLeads > 0 ? (converted / totalLeads) * 100 : 0,
      };
    } catch {
      return {
        totalLeads: 0,
        contacted: 0,
        responded: 0,
        converted: 0,
        responseRate: 0,
        conversionRate: 0,
      };
    }
  }

  /**
   * Map Campaign entity to response DTO.
   */
  private mapCampaignToResponse(campaign: Campaign): CampaignResponseDto {
    return {
      id: campaign.CampaignID,
      name: campaign.Name,
      status: campaign.Status,
      workspaceId: campaign.ProjectID,
      experimentId: campaign.ExperimentID,
      settings: campaign.Settings,
      createdAt: campaign.CreatedAt,
      updatedAt: campaign.UpdatedAt,
    };
  }
}

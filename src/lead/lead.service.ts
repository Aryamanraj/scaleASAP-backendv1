import { Inject, Injectable, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { LeadRepoService } from '../repo/lead-repo.service';
import { LeadSignalRepoService } from '../repo/lead-signal-repo.service';
import { CampaignRepoService } from '../repo/campaign-repo.service';
import { CampaignActivityRepoService } from '../repo/campaign-activity-repo.service';
import { GeneratedMessageRepoService } from '../repo/generated-message-repo.service';
import { Lead } from '../repo/entities/lead.entity';
import { LeadSignal } from '../repo/entities/lead-signal.entity';
import { Campaign } from '../repo/entities/campaign.entity';
import { Experiment } from '../repo/entities/experiment.entity';
import {
  GeneratedMessage,
  MessagePlatform,
  MessageType,
} from '../repo/entities/generated-message.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadsBatchDto } from './dto/create-leads-batch.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LogOutcomeDto } from './dto/log-outcome.dto';
import { CreateGeneratedMessageDto } from './dto/create-generated-message.dto';
import { GenerateOutreachDto } from './dto/generate-outreach.dto';
import { LeadStatus, ActivityType } from '../common/constants/entity.constants';
import {
  OutreachAIService,
  OutreachResult,
} from '../ai/services/outreach-ai.service';
import { OnboardingDataRepoService } from '../repo/onboarding-data-repo.service';
import { ExperimentRepoService } from '../repo/experiment-repo.service';

@Injectable()
export class LeadService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private leadRepoService: LeadRepoService,
    private leadSignalRepoService: LeadSignalRepoService,
    private campaignRepoService: CampaignRepoService,
    private campaignActivityRepoService: CampaignActivityRepoService,
    private generatedMessageRepoService: GeneratedMessageRepoService,
    private outreachAIService: OutreachAIService,
    private onboardingDataRepoService: OnboardingDataRepoService,
    private experimentRepoService: ExperimentRepoService,
  ) {}

  /**
   * Get all leads for a campaign.
   */
  async getLeadsForCampaign(campaignId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.getLeadsForCampaign: Getting leads [campaignId=${campaignId}]`,
      );

      const leads = await Promisify<Lead[]>(
        this.leadRepoService.getAll(
          {
            where: { CampaignID: campaignId },
            order: { CreatedAt: 'DESC' },
          },
          false,
        ),
      );

      this.logger.info(
        `LeadService.getLeadsForCampaign: Found ${leads.length} leads`,
      );

      return { data: leads, error: null };
    } catch (error) {
      this.logger.error(
        `LeadService.getLeadsForCampaign: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get all leads for a workspace (across all campaigns).
   */
  async getLeadsForWorkspace(workspaceId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.getLeadsForWorkspace: Getting leads [workspaceId=${workspaceId}]`,
      );

      // Get all campaigns for this workspace
      const campaigns = await Promisify<Campaign[]>(
        this.campaignRepoService.getAll(
          { where: { ProjectID: workspaceId } },
          false,
        ),
      );

      const campaignIds = campaigns.map((c) => c.CampaignID);

      if (campaignIds.length === 0) {
        return { data: [], error: null };
      }

      // Get leads for all campaigns
      const leads = await Promisify<Lead[]>(
        this.leadRepoService.getAll(
          {
            where: campaignIds.map((id) => ({ CampaignID: id })),
            relations: { Campaign: true },
            order: { CreatedAt: 'DESC' },
          },
          false,
        ),
      );

      this.logger.info(
        `LeadService.getLeadsForWorkspace: Found ${leads.length} leads`,
      );

      return { data: leads, error: null };
    } catch (error) {
      this.logger.error(
        `LeadService.getLeadsForWorkspace: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get a single lead by ID with signals.
   */
  async getLeadById(leadId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.getLeadById: Getting lead [leadId=${leadId}]`,
      );

      const lead = await Promisify<Lead>(
        this.leadRepoService.get(
          {
            where: { LeadID: leadId },
            relations: { Campaign: true },
          },
          true,
        ),
      );

      return { data: lead, error: null };
    } catch (error) {
      this.logger.error(`LeadService.getLeadById: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Create a single lead.
   */
  async createLead(
    campaignId: number,
    dto: CreateLeadDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.createLead: Creating lead [campaignId=${campaignId}, linkedinUrl=${dto.linkedinUrl}]`,
      );

      // Verify campaign exists and get project ID
      const campaign = await Promisify<Campaign>(
        this.campaignRepoService.get(
          { where: { CampaignID: campaignId } },
          true,
        ),
      );

      const lead = await Promisify<Lead>(
        this.leadRepoService.create({
          CampaignID: campaignId,
          ProjectID: campaign.ProjectID,
          LinkedinUrl: dto.linkedinUrl,
          FullName: dto.fullName || 'Unknown',
          Email: dto.email,
          JobTitle: dto.title,
          Company: dto.company,
          AvatarUrl: dto.profilePictureUrl,
          Location: dto.location,
          EnrichmentData: dto.enrichmentData,
          Status: LeadStatus.FOUND,
        }),
      );

      this.logger.info(
        `LeadService.createLead: Successfully created lead [leadId=${lead.LeadID}]`,
      );

      return { data: lead, error: null };
    } catch (error) {
      this.logger.error(`LeadService.createLead: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Create multiple leads in batch.
   */
  async createLeadsBatch(dto: CreateLeadsBatchDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.createLeadsBatch: Creating ${dto.leads.length} leads [campaignId=${dto.campaignId}]`,
      );

      // Verify campaign exists
      const campaign = await Promisify<Campaign>(
        this.campaignRepoService.get(
          { where: { CampaignID: dto.campaignId } },
          true,
        ),
      );

      const leadsData = dto.leads.map((l) => ({
        CampaignID: dto.campaignId,
        ProjectID: campaign.ProjectID,
        LinkedinUrl: l.linkedinUrl,
        FullName: l.fullName || 'Unknown',
        Email: l.email,
        JobTitle: l.title,
        Company: l.company,
        AvatarUrl: l.profilePictureUrl,
        Location: l.location,
        EnrichmentData: l.enrichmentData,
        Status: LeadStatus.FOUND,
      }));

      const leads = await Promisify<Lead[]>(
        this.leadRepoService.createMany(leadsData),
      );

      // Log activity
      await this.logCampaignActivity(dto.campaignId, ActivityType.LEADS_FOUND, {
        count: leads.length,
      });

      this.logger.info(
        `LeadService.createLeadsBatch: Successfully created ${leads.length} leads`,
      );

      return { data: leads, error: null };
    } catch (error) {
      this.logger.error(`LeadService.createLeadsBatch: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Update a lead.
   */
  async updateLead(
    leadId: number,
    dto: UpdateLeadDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.updateLead: Updating lead [leadId=${leadId}]`,
      );

      const updateData: Partial<Lead> = {};
      if (dto.fullName !== undefined) updateData.FullName = dto.fullName;
      if (dto.email !== undefined) updateData.Email = dto.email;
      if (dto.title !== undefined) updateData.JobTitle = dto.title;
      if (dto.company !== undefined) updateData.Company = dto.company;
      if (dto.status !== undefined) updateData.Status = dto.status;
      if (dto.icpScore !== undefined) updateData.RelevanceScore = dto.icpScore;
      if (dto.notes !== undefined) updateData.OutcomeReason = dto.notes;
      if (dto.enrichmentData !== undefined)
        updateData.EnrichmentData = dto.enrichmentData;

      await Promisify(
        this.leadRepoService.update({ LeadID: leadId }, updateData),
      );

      const lead = await Promisify<Lead>(
        this.leadRepoService.get({ where: { LeadID: leadId } }, true),
      );

      this.logger.info(
        `LeadService.updateLead: Successfully updated lead [leadId=${leadId}]`,
      );

      return { data: lead, error: null };
    } catch (error) {
      this.logger.error(`LeadService.updateLead: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Log an outcome for a lead.
   */
  async logOutcome(
    leadId: number,
    dto: LogOutcomeDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.logOutcome: Logging outcome [leadId=${leadId}, outcome=${dto.outcome}]`,
      );

      // Get lead to update
      const lead = await Promisify<Lead>(
        this.leadRepoService.get({ where: { LeadID: leadId } }, true),
      );

      // Update lead with outcome
      await Promisify(
        this.leadRepoService.update(
          { LeadID: leadId },
          {
            Outcome: dto.outcome,
            OutcomeReason: dto.notes || lead.OutcomeReason,
          },
        ),
      );

      // Log campaign activity
      await this.logCampaignActivity(
        lead.CampaignID,
        ActivityType.LEAD_RESPONDED,
        {
          leadId,
          outcome: dto.outcome,
          notes: dto.notes,
        },
      );

      const updatedLead = await Promisify<Lead>(
        this.leadRepoService.get({ where: { LeadID: leadId } }, true),
      );

      this.logger.info(
        `LeadService.logOutcome: Successfully logged outcome [leadId=${leadId}]`,
      );

      return { data: updatedLead, error: null };
    } catch (error) {
      this.logger.error(`LeadService.logOutcome: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Get signals for a lead.
   */
  async getLeadSignals(leadId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.getLeadSignals: Getting signals [leadId=${leadId}]`,
      );

      const signals = await Promisify<LeadSignal[]>(
        this.leadSignalRepoService.getAll(
          {
            where: { LeadID: leadId },
            order: { CreatedAt: 'DESC' },
          },
          false,
        ),
      );

      return { data: signals, error: null };
    } catch (error) {
      this.logger.error(`LeadService.getLeadSignals: Error - ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Get campaign ID for a lead (for access checking).
   */
  async getCampaignIdForLead(leadId: number): Promise<number | null> {
    try {
      const lead = await Promisify<Lead>(
        this.leadRepoService.get({ where: { LeadID: leadId } }, false),
      );
      return lead?.CampaignID || null;
    } catch {
      return null;
    }
  }

  /**
   * Helper to log campaign activity.
   */
  private async logCampaignActivity(
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
      this.logger.error(
        `LeadService.logCampaignActivity: Error - ${error.stack}`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATED MESSAGES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all generated messages for a lead.
   */
  async getGeneratedMessages(leadId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.getGeneratedMessages: Getting messages [leadId=${leadId}]`,
      );

      const messages = await Promisify<GeneratedMessage[]>(
        this.generatedMessageRepoService.getByLeadId(leadId),
      );

      return { data: messages, error: null };
    } catch (error) {
      this.logger.error(
        `LeadService.getGeneratedMessages: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Save a generated message for a lead.
   */
  async saveGeneratedMessage(
    leadId: number,
    dto: CreateGeneratedMessageDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.saveGeneratedMessage: Saving message [leadId=${leadId}, platform=${dto.platform}, type=${dto.messageType}]`,
      );

      // Verify lead exists
      const lead = await Promisify<Lead>(
        this.leadRepoService.get({ where: { LeadID: leadId } }, true),
      );

      const message = await Promisify<GeneratedMessage>(
        this.generatedMessageRepoService.create({
          LeadID: leadId,
          Platform: dto.platform,
          MessageType: dto.messageType,
          Content: dto.content,
          Context: dto.context,
          Thinking: dto.thinking,
          Timestamp: new Date(),
        }),
      );

      return { data: message, error: null };
    } catch (error) {
      this.logger.error(
        `LeadService.saveGeneratedMessage: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Delete a generated message.
   */
  async deleteGeneratedMessage(messageId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.deleteGeneratedMessage: Deleting message [messageId=${messageId}]`,
      );

      const result = await Promisify(
        this.generatedMessageRepoService.delete(messageId),
      );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(
        `LeadService.deleteGeneratedMessage: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Generate custom outreach for a lead using AI.
   */
  async generateOutreach(
    leadId: number,
    dto: GenerateOutreachDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LeadService.generateOutreach: Generating outreach [leadId=${leadId}, platform=${dto.platform}, type=${dto.messageType}]`,
      );

      // Get the lead with campaign
      const lead = await Promisify<Lead>(
        this.leadRepoService.get(
          {
            where: { LeadID: leadId },
            relations: { Campaign: true },
          },
          true,
        ),
      );

      // Get onboarding data for sender context
      const onboardingData = await Promisify(
        this.onboardingDataRepoService.getAll(
          {
            where: { ProjectID: lead.ProjectID },
            order: { CreatedAt: 'DESC' },
            take: 1,
          },
          false,
        ),
      );

      const onboarding = onboardingData?.[0];

      // Build sender context from onboarding data
      const senderContext = {
        companyName: onboarding?.CompanyName || 'Company',
        productDescription:
          onboarding?.ProductDescription || 'Product description',
        valueProposition: onboarding?.ValueProposition || 'Value proposition',
      };

      // Build lead context
      const leadContext = {
        name: lead.FullName,
        title: lead.JobTitle || '',
        company: lead.Company || '',
        industry: (lead.EnrichmentData as any)?.industry,
        linkedInActivity:
          (lead.EnrichmentData as any)?.recentActivity ||
          (lead.RawData as any)?.activity,
        recentPosts:
          (lead.EnrichmentData as any)?.posts || (lead.RawData as any)?.posts,
      };

      // Get experiment context if available
      let experimentContext;
      if (lead.Campaign?.ExperimentID) {
        const experiment = await Promisify<Experiment | null>(
          this.experimentRepoService.get(
            { where: { ExperimentID: lead.Campaign.ExperimentID } },
            false,
          ),
        );
        if (experiment) {
          experimentContext = {
            pattern: experiment.Pattern || '',
            pain: experiment.Pain || '',
            trigger: experiment.Trigger || '',
            outreachAngle: experiment.OutreachAngle || '',
          };
        }
      }

      // Generate the outreach using AI
      const result: OutreachResult =
        await this.outreachAIService.generateCustomOutreach(
          senderContext,
          leadContext,
          dto.platform as 'linkedin' | 'email',
          dto.messageType,
          dto.context,
          experimentContext,
        );

      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`LeadService.generateOutreach: Error - ${error.stack}`);
      return { data: null, error };
    }
  }
}

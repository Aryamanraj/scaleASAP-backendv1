import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Project } from './entities/project.entity';
import { User } from './entities/user.entity';
import { ProjectUser } from './entities/project-user.entity';
import { Person } from './entities/person.entity';
import { PersonProject } from './entities/person-project.entity';
import { Module as ModuleEntity } from './entities/module.entity';
import { ModuleRun } from './entities/module-run.entity';
import { Document } from './entities/document.entity';
import { Claim } from './entities/claim.entity';
import { LayerSnapshot } from './entities/layer-snapshot.entity';
import { PostItem } from './entities/post-item.entity';
import { ContentChunk } from './entities/content-chunk.entity';
import { ContentChunkItem } from './entities/content-chunk-item.entity';
import { ChunkEvidence } from './entities/chunk-evidence.entity';
import { DiscoveryRunItem } from './entities/discovery-run-item.entity';
import { Location } from './entities/location.entity';
import { Organization } from './entities/organization.entity';
// New workspace/campaign entities
import { OnboardingData } from './entities/onboarding-data.entity';
import { Experiment } from './entities/experiment.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignActivity } from './entities/campaign-activity.entity';
import { Lead } from './entities/lead.entity';
import { LeadSignal } from './entities/lead-signal.entity';
import { OutreachMessage } from './entities/outreach-message.entity';
import { DiscoverySession } from './entities/discovery-session.entity';
import { DiscoveryFeedback } from './entities/discovery-feedback.entity';
import { ClientRepoService } from './client-repo.service';
import { ProjectRepoService } from './project-repo.service';
import { UserRepoService } from './user-repo.service';
import { ProjectUserRepoService } from './project-user-repo.service';
import { PersonRepoService } from './person-repo.service';
import { PersonProjectRepoService } from './person-project-repo.service';
import { ModuleRepoService } from './module-repo.service';
import { ModuleRunRepoService } from './module-run-repo.service';
import { DocumentRepoService } from './document-repo.service';
import { ClaimRepoService } from './claim-repo.service';
import { LayerSnapshotRepoService } from './layer-snapshot-repo.service';
import { PostItemRepoService } from './post-item-repo.service';
import { ContentChunkRepoService } from './content-chunk-repo.service';
import { ContentChunkItemRepoService } from './content-chunk-item-repo.service';
import { ChunkEvidenceRepoService } from './chunk-evidence-repo.service';
import { DiscoveryRunItemRepoService } from './discovery-run-item-repo.service';
import { LocationRepoService } from './location-repo.service';
import { OrganizationRepoService } from './organization-repo.service';
// New workspace/campaign repo services
import { OnboardingDataRepoService } from './onboarding-data-repo.service';
import { ExperimentRepoService } from './experiment-repo.service';
import { CampaignRepoService } from './campaign-repo.service';
import { CampaignActivityRepoService } from './campaign-activity-repo.service';
import { LeadRepoService } from './lead-repo.service';
import { LeadSignalRepoService } from './lead-signal-repo.service';
import { OutreachMessageRepoService } from './outreach-message-repo.service';
import { DiscoverySessionRepoService } from './discovery-session-repo.service';
import { DiscoveryFeedbackRepoService } from './discovery-feedback-repo.service';
import { GeneratedMessage } from './entities/generated-message.entity';
import { GeneratedMessageRepoService } from './generated-message-repo.service';
import { FlowRun } from './entities/flow-run.entity';
import { FlowRunRepoService } from './flow-run-repo.service';

export const entities = [
  Client,
  Project,
  User,
  ProjectUser,
  Person,
  PersonProject,
  ModuleEntity,
  ModuleRun,
  Document,
  Claim,
  LayerSnapshot,
  PostItem,
  ContentChunk,
  ContentChunkItem,
  ChunkEvidence,
  DiscoveryRunItem,
  Location,
  Organization,
  // New workspace/campaign entities
  OnboardingData,
  Experiment,
  Campaign,
  CampaignActivity,
  Lead,
  LeadSignal,
  OutreachMessage,
  DiscoverySession,
  DiscoveryFeedback,
  GeneratedMessage,
  FlowRun,
];

export const repoServices = [
  ClientRepoService,
  ProjectRepoService,
  UserRepoService,
  ProjectUserRepoService,
  PersonRepoService,
  PersonProjectRepoService,
  ModuleRepoService,
  ModuleRunRepoService,
  DocumentRepoService,
  ClaimRepoService,
  LayerSnapshotRepoService,
  PostItemRepoService,
  ContentChunkRepoService,
  ContentChunkItemRepoService,
  ChunkEvidenceRepoService,
  DiscoveryRunItemRepoService,
  LocationRepoService,
  OrganizationRepoService,
  // New workspace/campaign repo services
  OnboardingDataRepoService,
  ExperimentRepoService,
  CampaignRepoService,
  CampaignActivityRepoService,
  LeadRepoService,
  LeadSignalRepoService,
  OutreachMessageRepoService,
  DiscoverySessionRepoService,
  DiscoveryFeedbackRepoService,
  GeneratedMessageRepoService,
  FlowRunRepoService,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: repoServices,
  exports: repoServices,
})
export class RepoModule {}

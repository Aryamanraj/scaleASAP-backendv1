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
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: repoServices,
  exports: repoServices,
})
export class RepoModule {}

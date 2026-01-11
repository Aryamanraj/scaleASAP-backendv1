import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
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
import { CompanyRepoService } from './company-repo.service';
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

export const entities = [
  Company,
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
];

export const repoServices = [
  CompanyRepoService,
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
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: repoServices,
  exports: repoServices,
})
export class RepoModule {}

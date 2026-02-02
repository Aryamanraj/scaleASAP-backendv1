import { DataSource } from 'typeorm';
import { Client } from './src/repo/entities/client.entity';
import { User } from './src/repo/entities/user.entity';
import { Project } from './src/repo/entities/project.entity';
import { Module } from './src/repo/entities/module.entity';
import { ModuleRun } from './src/repo/entities/module-run.entity';
import { Person } from './src/repo/entities/person.entity';
import { PersonProject } from './src/repo/entities/person-project.entity';
import { Document } from './src/repo/entities/document.entity';
import { Location } from './src/repo/entities/location.entity';
import { Organization } from './src/repo/entities/organization.entity';
import { Lead } from './src/repo/entities/lead.entity';
import { LeadSignal } from './src/repo/entities/lead-signal.entity';
import { Campaign } from './src/repo/entities/campaign.entity';
import { CampaignActivity } from './src/repo/entities/campaign-activity.entity';
import { OutreachMessage } from './src/repo/entities/outreach-message.entity';
import { Experiment } from './src/repo/entities/experiment.entity';
import { DiscoverySession } from './src/repo/entities/discovery-session.entity';
import { DiscoveryFeedback } from './src/repo/entities/discovery-feedback.entity';
import { OnboardingData } from './src/repo/entities/onboarding-data.entity';
import { GeneratedMessage } from './src/repo/entities/generated-message.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'temp_schema_gen',
  entities: [
    Client, User, Project, Module, ModuleRun, Person, PersonProject, Document,
    Location, Organization, Lead, LeadSignal, Campaign, CampaignActivity,
    OutreachMessage, Experiment, DiscoverySession, DiscoveryFeedback,
    OnboardingData, GeneratedMessage
  ],
  synchronize: false,
  logging: false,
});

async function generateSchema() {
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  const upQueries = await queryRunner.createSchema(true);
  console.log('-- Auto-generated schema from TypeORM entities');
  console.log(upQueries);
  await queryRunner.release();
  await dataSource.destroy();
}

generateSchema().catch(console.error);

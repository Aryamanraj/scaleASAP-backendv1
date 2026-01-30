import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Campaign } from './campaign.entity';
import { Project } from './project.entity';
import { Person } from './person.entity';
import {
  LeadStatus,
  LeadOutcome,
} from '../../common/constants/entity.constants';

/**
 * Lead entity - represents a prospect lead within a campaign.
 * Contains contact info, enrichment data, and outreach status.
 */
@Entity({ name: 'Leads' })
@Index(['CampaignID'])
@Index(['ProjectID'])
@Index(['ProjectID', 'Status'])
@Index(['LinkedinUrl'])
export class Lead extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  LeadID: number;

  @ApiProperty({ description: 'Campaign ID this lead belongs to' })
  @Column({ type: 'bigint', nullable: false })
  CampaignID: number;

  @ApiProperty({ description: 'Project/Workspace ID this lead belongs to' })
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty({ description: 'Optional link to global Person record' })
  @Column({ type: 'bigint', nullable: true })
  PersonID: number;

  @ApiProperty({ description: 'Lead full name' })
  @Column({ length: 255, nullable: false })
  FullName: string;

  @ApiProperty({ description: 'Job title' })
  @Column({ length: 255, nullable: true })
  JobTitle: string;

  @ApiProperty({ description: 'Company name' })
  @Column({ length: 255, nullable: true })
  Company: string;

  @ApiProperty({ description: 'LinkedIn profile URL' })
  @Column({ length: 512, nullable: true })
  LinkedinUrl: string;

  @ApiProperty({ description: 'Email address' })
  @Column({ length: 255, nullable: true })
  Email: string;

  @ApiProperty({ description: 'Phone number' })
  @Column({ length: 50, nullable: true })
  Phone: string;

  @ApiProperty({ description: 'Location' })
  @Column({ length: 255, nullable: true })
  Location: string;

  @ApiProperty({ description: 'Profile avatar URL' })
  @Column({ length: 512, nullable: true })
  AvatarUrl: string;

  @ApiProperty({ description: 'AI-generated summary of the lead' })
  @Column({ type: 'text', nullable: true })
  AiSummary: string;

  @ApiProperty({ description: 'Relevance score (0-100)' })
  @Column({ type: 'int', nullable: true })
  RelevanceScore: number;

  @ApiProperty({ enum: Object.values(LeadStatus), description: 'Lead status' })
  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.FOUND,
  })
  Status: LeadStatus;

  @ApiProperty({
    enum: Object.values(LeadOutcome),
    description: 'Lead outcome',
  })
  @Column({
    type: 'enum',
    enum: LeadOutcome,
    nullable: true,
  })
  Outcome: LeadOutcome;

  @ApiProperty({ description: 'Reason for outcome' })
  @Column({ type: 'text', nullable: true })
  OutcomeReason: string;

  @ApiProperty({ description: 'Raw data from lead source (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  RawData: object;

  @ApiProperty({
    description: 'Enrichment data from Wiza/other sources (JSON)',
  })
  @Column({ type: 'jsonb', nullable: true })
  EnrichmentData: object;

  @ApiProperty({ description: 'Generated outbound message' })
  @Column({ type: 'text', nullable: true })
  OutboundMessage: string;

  @ApiProperty({ description: 'When the lead was contacted' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  ContactedAt: Date;

  @ApiProperty({ description: 'When the lead responded' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  RespondedAt: Date;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  CreatedAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  UpdatedAt: Date;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'CampaignID' })
  Campaign: Campaign;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'PersonID' })
  Person: Person;
}

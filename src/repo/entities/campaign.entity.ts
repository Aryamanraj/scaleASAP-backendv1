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
import { Project } from './project.entity';
import { Experiment } from './experiment.entity';
import { CampaignStatus } from '../../common/constants/entity.constants';

/**
 * Campaign entity - represents an outreach campaign within a workspace.
 * Campaigns are linked to experiments and contain leads for outreach.
 */
@Entity({ name: 'Campaigns' })
@Index(['ProjectID'])
@Index(['ExperimentID'])
@Index(['ProjectID', 'Status'])
export class Campaign extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  CampaignID: number;

  @ApiProperty({ description: 'Project/Workspace ID this campaign belongs to' })
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty({ description: 'Experiment ID this campaign is based on' })
  @Column({ type: 'bigint', nullable: true })
  ExperimentID: number;

  @ApiProperty({ description: 'Campaign name' })
  @Column({ length: 255, nullable: false })
  Name: string;

  @ApiProperty({
    enum: Object.values(CampaignStatus),
    description: 'Campaign status',
  })
  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.ACTIVE,
  })
  Status: CampaignStatus;

  @ApiProperty({ description: 'Campaign settings (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  Settings: object;

  @ApiProperty({ description: 'Maximum leads to process per day' })
  @Column({ type: 'int', default: 50 })
  DailyLeadLimit: number;

  @ApiProperty({ description: 'Whether autopilot mode is enabled' })
  @Column({ type: 'boolean', default: false })
  AutopilotEnabled: boolean;

  @ApiProperty({ description: 'Timestamp of last discovery run' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  LastDiscoveryRun: Date;

  @ApiProperty({ description: 'Timestamp of next scheduled discovery run' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  NextDiscoveryRun: Date;

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

  @ApiProperty({ description: 'Soft delete timestamp' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  DeletedAt: Date;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => Experiment, { nullable: true })
  @JoinColumn({ name: 'ExperimentID' })
  Experiment: Experiment;
}

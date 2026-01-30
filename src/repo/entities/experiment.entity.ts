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
import {
  ExperimentType,
  ExperimentStatus,
} from '../../common/constants/entity.constants';

/**
 * Experiment entity - represents an ICP experiment within a workspace.
 * Experiments are generated from discovery conversations and define targeting criteria.
 */
@Entity({ name: 'Experiments' })
@Index(['ProjectID'])
@Index(['ProjectID', 'Status'])
export class Experiment extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ExperimentID: number;

  @ApiProperty({
    description: 'Project/Workspace ID this experiment belongs to',
  })
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty({ description: 'Experiment name' })
  @Column({ length: 255, nullable: false })
  Name: string;

  @ApiProperty({
    enum: Object.values(ExperimentType),
    description: 'Type of experiment',
  })
  @Column({
    type: 'enum',
    enum: ExperimentType,
  })
  Type: ExperimentType;

  @ApiProperty({ description: 'ICP pattern description' })
  @Column({ type: 'text', nullable: true })
  Pattern: string;

  @ApiProperty({ description: 'Target industries (JSON array)' })
  @Column({ type: 'jsonb', nullable: true })
  Industries: object;

  @ApiProperty({ description: 'Pain point this experiment targets' })
  @Column({ type: 'text', nullable: true })
  Pain: string;

  @ApiProperty({ description: 'Trigger event that makes outreach timely' })
  @Column({ type: 'text', nullable: true })
  Trigger: string;

  @ApiProperty({ description: 'Wiza search filters (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  WizaFilters: object;

  @ApiProperty({ description: 'Suggested outreach angle for this ICP' })
  @Column({ type: 'text', nullable: true })
  OutreachAngle: string;

  @ApiProperty({
    enum: Object.values(ExperimentStatus),
    description: 'Current status',
  })
  @Column({
    type: 'enum',
    enum: ExperimentStatus,
    default: ExperimentStatus.PENDING,
  })
  Status: ExperimentStatus;

  @ApiProperty({ description: 'Number of leads found for this experiment' })
  @Column({ type: 'int', default: 0 })
  LeadsFound: number;

  @ApiProperty({ description: 'Number of leads currently warming' })
  @Column({ type: 'int', default: 0 })
  LeadsWarming: number;

  @ApiProperty({
    description: 'Number of meetings booked from this experiment',
  })
  @Column({ type: 'int', default: 0 })
  MeetingsBooked: number;

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

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;
}

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
import { Person } from './person.entity';
import { User } from './user.entity';
import { FlowRunStatus } from '../../common/constants/entity.constants';

@Entity({ name: 'FlowRuns' })
@Index(['ProjectID', 'PersonID', 'CreatedAt'])
@Index(['FlowKey', 'CreatedAt'])
export class FlowRun extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  FlowRunID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  PersonID: number | null;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  TriggeredByUserID: number | null;

  @ApiProperty()
  @Column({ length: 128, nullable: false })
  FlowKey: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  InputSummaryJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  ModulesScheduledJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  ModulesCompletedJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  ModulesFailedJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  FailureReasonsJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  FinalSummaryJson: any;

  @ApiProperty({ enum: Object.values(FlowRunStatus) })
  @Column({
    type: 'enum',
    enum: FlowRunStatus,
    default: FlowRunStatus.QUEUED,
  })
  Status: FlowRunStatus;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  StartedAt: Date;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  FinishedAt: Date;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  ErrorJson: any;

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

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'PersonID' })
  Person: Person;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'TriggeredByUserID' })
  TriggeredByUser: User;
}

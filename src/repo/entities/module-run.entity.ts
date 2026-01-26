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
import { ModuleRunStatus } from '../../common/constants/entity.constants';

@Entity({ name: 'ModuleRuns' })
@Index(['ProjectID', 'PersonID', 'CreatedAt'])
export class ModuleRun extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ModuleRunID: number;

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
  ModuleKey: string;

  @ApiProperty()
  @Column({ length: 32, nullable: false })
  ModuleVersion: string;

  @ApiProperty({ enum: Object.values(ModuleRunStatus) })
  @Column({
    type: 'enum',
    enum: ModuleRunStatus,
    default: ModuleRunStatus.QUEUED,
  })
  Status: ModuleRunStatus;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  InputConfigJson: any;

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

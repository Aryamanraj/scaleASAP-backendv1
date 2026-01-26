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
import { ModuleRun } from './module-run.entity';
import { Project } from './project.entity';
import { Person } from './person.entity';
import { Document } from './document.entity';
import { DiscoveryRunItemStatus } from '../../common/constants/entity.constants';

/**
 * DiscoveryRunItems Entity
 *
 * Tracks which persons were discovered in a project-level run.
 * Used for lineage tracking, observability, and retry logic.
 */
@Entity({ name: 'DiscoveryRunItems' })
@Index(['ModuleRunID', 'ProjectID'])
@Index(['ProjectID', 'PersonID'])
export class DiscoveryRunItem extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  DiscoveryRunItemID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ModuleRunID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  PersonID: number | null;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  SourceRef: string | null;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  CreatedDocumentID: number | null;

  @ApiProperty({ enum: Object.values(DiscoveryRunItemStatus) })
  @Column({
    type: 'enum',
    enum: DiscoveryRunItemStatus,
    nullable: false,
  })
  Status: DiscoveryRunItemStatus;

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

  @ManyToOne(() => ModuleRun)
  @JoinColumn({ name: 'ModuleRunID' })
  ModuleRun: ModuleRun;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'PersonID' })
  Person: Person;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'CreatedDocumentID' })
  CreatedDocument: Document;
}

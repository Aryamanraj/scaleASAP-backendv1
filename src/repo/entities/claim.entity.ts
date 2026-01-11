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
import { Document } from './document.entity';
import { ModuleRun } from './module-run.entity';

@Entity({ name: 'Claims' })
@Index(['ProjectID', 'PersonID', 'ClaimType', 'GroupKey', 'CreatedAt'])
export class Claim extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ClaimID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PersonID: number;

  @ApiProperty()
  @Column({ length: 128, nullable: false })
  ClaimType: string;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  GroupKey: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: false })
  ValueJson: any;

  @ApiProperty()
  @Column({ type: 'double precision', nullable: false })
  Confidence: number;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  ObservedAt: Date;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  ValidFrom: Date;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  ValidTo: Date;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  SupersededAt: Date;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  ReplacedByClaimID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  SourceDocumentID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ModuleRunID: number;

  @ApiProperty()
  @Column({ length: 32, nullable: false })
  SchemaVersion: string;

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

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'SourceDocumentID' })
  Document: Document;

  @ManyToOne(() => ModuleRun)
  @JoinColumn({ name: 'ModuleRunID' })
  ModuleRun: ModuleRun;
}

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
import { ModuleRun } from './module-run.entity';

@Entity({ name: 'Documents' })
@Index('IDX_DOCUMENT_LATEST_VALID', [
  'ProjectID',
  'PersonID',
  'Source',
  'DocumentKind',
  'IsValid',
  'CapturedAt',
])
@Index('IDX_DOCUMENT_CREATED_AT', ['CreatedAt'])
export class Document extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  DocumentID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  PersonID: number | null;

  @ApiProperty()
  @Column({ length: 64, nullable: false })
  Source: string;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  SourceRef: string;

  @ApiProperty()
  @Column({ length: 64, nullable: false })
  ContentType: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64, nullable: true })
  DocumentKind: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsValid: boolean;

  @ApiProperty()
  @Column({ type: 'text', nullable: false })
  StorageUri: string;

  @ApiProperty()
  @Column({ length: 128, nullable: false })
  Hash: string;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: false })
  CapturedAt: Date;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ModuleRunID: number;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  PayloadJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  InvalidatedMetaJson: any;

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

  @ManyToOne(() => ModuleRun)
  @JoinColumn({ name: 'ModuleRunID' })
  ModuleRun: ModuleRun;
}

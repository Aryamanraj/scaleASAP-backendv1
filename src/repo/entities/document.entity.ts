import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Project } from './project.entity';
import { Person } from './person.entity';
import { ModuleRun } from './module-run.entity';

@Entity({ name: 'Documents' })
export class Document extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  DocumentID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PersonID: number;

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

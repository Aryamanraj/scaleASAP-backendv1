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
import { DATA_SOURCE } from '../../common/types/posts.types';

@Entity({ name: 'PostItems' })
@Index(['ProjectID', 'PersonID', 'PostedAt'])
@Index(['ProjectID', 'PersonID', 'Fingerprint'], { unique: true })
export class PostItem extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PostItemID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PersonID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  SourceDocumentID: number;

  @ApiProperty({ enum: DATA_SOURCE })
  @Column({ type: 'enum', enum: DATA_SOURCE, nullable: false })
  Source: DATA_SOURCE;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  PlatformPostID: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  Permalink: string;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  PostedAt: Date;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  Text: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  MediaUrlsJson: any;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  EngagementJson: any;

  @ApiProperty()
  @Column({ length: 255, nullable: false })
  Fingerprint: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true, nullable: false })
  IsValid: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone' })
  CreatedAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  UpdatedAt: Date;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => Person, { nullable: false })
  @JoinColumn({ name: 'PersonID' })
  Person: Person;

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn({ name: 'SourceDocumentID' })
  SourceDocument: Document;
}

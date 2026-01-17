import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Project } from './project.entity';
import { Person } from './person.entity';
import { ContentChunkItem } from './content-chunk-item.entity';

@Entity({ name: 'ContentChunks' })
@Index(['ProjectID', 'PersonID', 'ChunkType', 'FromAt', 'ToAt'])
@Index(['ProjectID', 'PersonID', 'Fingerprint'], { unique: true })
export class ContentChunk extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ContentChunkID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PersonID: number;

  @ApiProperty()
  @Column({ length: 50, nullable: false })
  Source: string;

  @ApiProperty()
  @Column({ length: 50, nullable: false })
  ChunkType: string;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  FromAt: Date;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: true })
  ToAt: Date;

  @ApiProperty()
  @Column({ type: 'int', default: 0, nullable: false })
  PostCount: number;

  @ApiProperty()
  @Column({ length: 255, nullable: false })
  Fingerprint: string;

  @ApiProperty()
  @Column({ length: 50, nullable: false })
  Status: string;

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

  @OneToMany(() => ContentChunkItem, (item) => item.ContentChunk)
  Items: ContentChunkItem[];
}

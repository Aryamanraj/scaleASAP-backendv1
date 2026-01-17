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
import { ContentChunk } from './content-chunk.entity';

@Entity({ name: 'ChunkEvidences' })
@Index(['ContentChunkID'], { unique: true })
export class ChunkEvidence extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ChunkEvidenceID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ContentChunkID: number;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  EvidenceJson: any;

  @ApiProperty()
  @Column({ length: 50, nullable: false })
  AIProvider: string;

  @ApiProperty()
  @Column({ length: 100, nullable: false })
  AIModel: string;

  @ApiProperty()
  @Column({ type: 'int', nullable: true })
  TokensUsed: number;

  @ApiProperty()
  @Column({ length: 50, nullable: false })
  Status: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  ErrorJson: any;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone' })
  CreatedAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  UpdatedAt: Date;

  @ManyToOne(() => ContentChunk, { nullable: false })
  @JoinColumn({ name: 'ContentChunkID' })
  ContentChunk: ContentChunk;
}

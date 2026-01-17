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
import { PostItem } from './post-item.entity';

@Entity({ name: 'ContentChunkItems' })
@Index(['ContentChunkID', 'PostItemID'], { unique: true })
export class ContentChunkItem extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ContentChunkItemID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ContentChunkID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PostItemID: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone' })
  CreatedAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  UpdatedAt: Date;

  @ManyToOne(() => ContentChunk, (chunk) => chunk.Items, { nullable: false })
  @JoinColumn({ name: 'ContentChunkID' })
  ContentChunk: ContentChunk;

  @ManyToOne(() => PostItem, { nullable: false })
  @JoinColumn({ name: 'PostItemID' })
  PostItem: PostItem;
}

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
import { DiscoverySessionStatus } from '../../common/constants/entity.constants';

/**
 * DiscoverySession entity - stores discovery conversation sessions.
 * Contains the chat history and generated ICPs from each session.
 */
@Entity({ name: 'DiscoverySessions' })
@Index(['ProjectID'])
export class DiscoverySession extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  DiscoverySessionID: number;

  @ApiProperty({ description: 'Project/Workspace ID this session belongs to' })
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty({ description: 'Chat messages in this session (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  Messages: object;

  @ApiProperty({ description: 'Generated ICPs from this session (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  GeneratedIcps: object;

  @ApiProperty({
    enum: Object.values(DiscoverySessionStatus),
    description: 'Session status',
  })
  @Column({
    type: 'enum',
    enum: DiscoverySessionStatus,
    default: DiscoverySessionStatus.ACTIVE,
  })
  Status: DiscoverySessionStatus;

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
}

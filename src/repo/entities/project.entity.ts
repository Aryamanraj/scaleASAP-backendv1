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
import { Client } from './client.entity';
import { User } from './user.entity';
import {
  ProjectStatus,
  OnboardingStatus,
} from '../../common/constants/entity.constants';

/**
 * Project entity - serves as a "Workspace" in the frontend-v1 context.
 *
 * The frontend-v1 concept of "Workspace" maps directly to this Project entity.
 * This allows reuse of existing ProjectUsers for team/member management.
 */
@Entity({ name: 'Projects' })
@Index(['ClientID', 'Status'])
@Index(['OwnerUserID'])
export class Project extends BaseEntity {
  // ═══════════════════════════════════════════════════════════════
  // EXISTING FIELDS (unchanged)
  // ═══════════════════════════════════════════════════════════════

  @ApiProperty()
  @PrimaryGeneratedColumn()
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ClientID: number;

  @ApiProperty()
  @Column({ length: 255, nullable: false })
  Name: string;

  @ApiProperty({ enum: Object.values(ProjectStatus) })
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  Status: ProjectStatus;

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

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'ClientID' })
  Client: Client;

  // ═══════════════════════════════════════════════════════════════
  // NEW FIELDS (workspace functionality from frontend-v1)
  // ═══════════════════════════════════════════════════════════════

  @ApiProperty({ description: 'Company website URL' })
  @Column({ length: 512, nullable: true })
  Website: string;

  @ApiProperty({ description: 'Company favicon URL' })
  @Column({ length: 512, nullable: true })
  FaviconUrl: string;

  @ApiProperty({
    enum: Object.values(OnboardingStatus),
    description: 'Onboarding completion status',
  })
  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.INCOMPLETE,
  })
  OnboardingStatus: OnboardingStatus;

  @ApiProperty({ description: 'Discovery chat conversation history (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  DiscoveryChatHistory: object;

  @ApiProperty({ description: 'Workspace settings (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  Settings: object;

  @ApiProperty({ description: 'Owner user ID' })
  @Column({ type: 'bigint', nullable: true })
  OwnerUserID: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'OwnerUserID' })
  Owner: User;
}

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
import { Lead } from './lead.entity';
import { Campaign } from './campaign.entity';
import {
  OutreachFormat,
  OutreachStatus,
} from '../../common/constants/entity.constants';

/**
 * OutreachMessage entity - stores outreach messages sent to leads.
 * Tracks message content, delivery status, and engagement.
 */
@Entity({ name: 'OutreachMessages' })
@Index(['LeadID'])
@Index(['CampaignID'])
export class OutreachMessage extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  OutreachMessageID: number;

  @ApiProperty({ description: 'Lead ID this message is for' })
  @Column({ type: 'bigint', nullable: false })
  LeadID: number;

  @ApiProperty({ description: 'Campaign ID this message belongs to' })
  @Column({ type: 'bigint', nullable: false })
  CampaignID: number;

  @ApiProperty({
    enum: Object.values(OutreachFormat),
    description: 'Message format',
  })
  @Column({
    type: 'enum',
    enum: OutreachFormat,
  })
  Format: OutreachFormat;

  @ApiProperty({ description: 'Whether this is a followup message' })
  @Column({ type: 'boolean', default: false })
  IsFollowup: boolean;

  @ApiProperty({ description: 'Sequence number in the outreach sequence' })
  @Column({ type: 'int', default: 1 })
  SequenceNumber: number;

  @ApiProperty({ description: 'Message content' })
  @Column({ type: 'text', nullable: false })
  Content: string;

  @ApiProperty({ description: 'Email subject line (if applicable)' })
  @Column({ length: 255, nullable: true })
  Subject: string;

  @ApiProperty({
    enum: Object.values(OutreachStatus),
    description: 'Message status',
  })
  @Column({
    type: 'enum',
    enum: OutreachStatus,
    default: OutreachStatus.DRAFT,
  })
  Status: OutreachStatus;

  @ApiProperty({ description: 'Scheduled send time' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  ScheduledAt: Date;

  @ApiProperty({ description: 'Actual send time' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  SentAt: Date;

  @ApiProperty({ description: 'When the message was opened' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  OpenedAt: Date;

  @ApiProperty({ description: 'When a reply was received' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  RepliedAt: Date;

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

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'LeadID' })
  Lead: Lead;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'CampaignID' })
  Campaign: Campaign;
}

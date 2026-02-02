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

/**
 * Platform for outreach message
 */
export enum MessagePlatform {
  LINKEDIN = 'linkedin',
  EMAIL = 'email',
}

/**
 * Type of outreach message
 */
export enum MessageType {
  CONNECTION_REQUEST = 'connection_request',
  FOLLOW_UP = 'follow_up',
  FIRST_TOUCH = 'first_touch',
  CUSTOM = 'custom',
}

/**
 * GeneratedMessage entity - stores AI-generated outreach messages for leads.
 */
@Entity({ name: 'GeneratedMessages' })
@Index(['LeadID'])
@Index(['LeadID', 'Platform'])
export class GeneratedMessage extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn({ name: 'GeneratedMessageID' })
  GeneratedMessageID: number;

  @ApiProperty({ description: 'Lead ID this message belongs to' })
  @Column({ type: 'bigint', nullable: false })
  LeadID: number;

  @ApiProperty({
    enum: MessagePlatform,
    description: 'Platform for the message (linkedin or email)',
  })
  @Column({
    type: 'enum',
    enum: MessagePlatform,
    nullable: false,
  })
  Platform: MessagePlatform;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message',
  })
  @Column({
    type: 'enum',
    enum: MessageType,
    nullable: false,
  })
  MessageType: MessageType;

  @ApiProperty({ description: 'The generated message content' })
  @Column({ type: 'text', nullable: false })
  Content: string;

  @ApiProperty({ description: 'User-provided context for generation' })
  @Column({ type: 'text', nullable: true })
  Context: string;

  @ApiProperty({ description: 'AI reasoning/thinking process (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  Thinking: object;

  @ApiProperty({ description: 'Timestamp when the message was generated' })
  @Column({ type: 'timestamp with time zone', nullable: false })
  Timestamp: Date;

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

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'LeadID' })
  Lead: Lead;
}

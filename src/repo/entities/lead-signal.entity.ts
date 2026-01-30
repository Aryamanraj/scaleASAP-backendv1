import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Lead } from './lead.entity';
import { SignalType } from '../../common/constants/entity.constants';

/**
 * LeadSignal entity - stores buying signals detected for a lead.
 * Signals help prioritize outreach timing and messaging.
 */
@Entity({ name: 'LeadSignals' })
@Index(['LeadID'])
export class LeadSignal extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  LeadSignalID: number;

  @ApiProperty({ description: 'Lead ID this signal belongs to' })
  @Column({ type: 'bigint', nullable: false })
  LeadID: number;

  @ApiProperty({ description: 'Signal headline' })
  @Column({ length: 255, nullable: false })
  Headline: string;

  @ApiProperty({ description: 'Signal description' })
  @Column({ type: 'text', nullable: true })
  Description: string;

  @ApiProperty({
    enum: Object.values(SignalType),
    description: 'Type of signal',
  })
  @Column({
    type: 'enum',
    enum: SignalType,
  })
  SignalType: SignalType;

  @ApiProperty({ description: 'Signal strength score (0-100)' })
  @Column({ type: 'int', nullable: true })
  StrengthScore: number;

  @ApiProperty({ description: 'Citations/sources for this signal (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  Citations: object;

  @ApiProperty({ description: 'When the signal was detected' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  DetectedAt: Date;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  CreatedAt: Date;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'LeadID' })
  Lead: Lead;
}

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
import { Campaign } from './campaign.entity';
import { ActivityType } from '../../common/constants/entity.constants';

/**
 * CampaignActivity entity - logs activities and events within a campaign.
 * Used for tracking campaign progress and displaying activity feeds.
 */
@Entity({ name: 'CampaignActivities' })
@Index(['CampaignID', 'CreatedAt'])
export class CampaignActivity extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  CampaignActivityID: number;

  @ApiProperty({ description: 'Campaign ID this activity belongs to' })
  @Column({ type: 'bigint', nullable: false })
  CampaignID: number;

  @ApiProperty({
    enum: Object.values(ActivityType),
    description: 'Type of activity',
  })
  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  ActivityType: ActivityType;

  @ApiProperty({ description: 'Activity title' })
  @Column({ length: 255, nullable: false })
  Title: string;

  @ApiProperty({ description: 'Activity description' })
  @Column({ type: 'text', nullable: true })
  Description: string;

  @ApiProperty({ description: 'Additional activity metadata (JSON)' })
  @Column({ type: 'jsonb', nullable: true })
  Metadata: object;

  @ApiProperty({ description: 'Activity status (e.g., success, error)' })
  @Column({ length: 50, nullable: true })
  Status: string;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  CreatedAt: Date;

  @ManyToOne(() => Campaign)
  @JoinColumn({ name: 'CampaignID' })
  Campaign: Campaign;
}

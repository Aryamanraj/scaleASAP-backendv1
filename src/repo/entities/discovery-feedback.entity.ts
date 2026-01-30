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
import { Project } from './project.entity';
import { User } from './user.entity';

/**
 * DiscoveryFeedback entity - stores user feedback on discovery/experiment results.
 * Used to improve ICP generation quality over time.
 */
@Entity({ name: 'DiscoveryFeedback' })
@Index(['ProjectID'])
export class DiscoveryFeedback extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  DiscoveryFeedbackID: number;

  @ApiProperty({ description: 'Project/Workspace ID this feedback belongs to' })
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty({ description: 'User ID who provided feedback' })
  @Column({ type: 'bigint', nullable: false })
  UserID: number;

  @ApiProperty({ description: 'Rating (1-5)' })
  @Column({ type: 'int', nullable: false })
  Rating: number;

  @ApiProperty({ description: 'Feedback text' })
  @Column({ type: 'text', nullable: true })
  Feedback: string;

  @ApiProperty({
    description: 'Context about which experiment this feedback is for (JSON)',
  })
  @Column({ type: 'jsonb', nullable: true })
  ExperimentContext: object;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  CreatedAt: Date;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserID' })
  User: User;
}

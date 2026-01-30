import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Project } from './project.entity';

/**
 * OnboardingData entity - stores workspace onboarding questionnaire data.
 * One-to-one relationship with Project (workspace).
 */
@Entity({ name: 'OnboardingData' })
@Index(['ProjectID'], { unique: true })
export class OnboardingData extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  OnboardingDataID: number;

  @ApiProperty({
    description: 'Project/Workspace ID this onboarding belongs to',
  })
  @Column({ type: 'bigint', nullable: false, unique: true })
  ProjectID: number;

  @ApiProperty({ description: 'Onboarding questionnaire data (JSON)' })
  @Column({ type: 'jsonb', nullable: false })
  Data: object;

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

  @OneToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;
}

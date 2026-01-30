/**
 * Async Job Response DTO
 * Response format for job status queries.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { AsyncJobType } from '../../common/constants/entity.constants';

export class AsyncJobResponseDto {
  @ApiProperty({ description: 'Unique job identifier (Bull job ID)' })
  @Expose()
  jobId: string;

  @ApiProperty({
    enum: Object.values(AsyncJobType),
    description: 'Type of async job',
  })
  @Expose()
  jobType: AsyncJobType;

  @ApiProperty({
    description:
      'Current job status: pending | queued | processing | completed | failed',
  })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Progress percentage (0-100)', example: 75 })
  @Expose()
  progress: number;

  @ApiProperty({
    description: 'Formatted progress string',
    example: '75% complete',
  })
  @Expose()
  progressText: string;

  @ApiProperty({ description: 'Number of completed steps', example: 3 })
  @Expose()
  completedSteps: number;

  @ApiProperty({ description: 'Total number of steps', example: 4 })
  @Expose()
  totalSteps: number;

  @ApiProperty({
    description: 'Current step description',
    example: 'Enriching lead 3 of 4',
  })
  @Expose()
  currentStep: string;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in seconds',
    nullable: true,
  })
  @Expose()
  estimatedSecondsRemaining: number | null;

  @ApiPropertyOptional({
    description: 'Job output data (when completed)',
    nullable: true,
  })
  @Expose()
  output: object | null;

  @ApiPropertyOptional({
    description: 'Error message (when failed)',
    nullable: true,
  })
  @Expose()
  errorMessage: string | null;

  @ApiProperty({ description: 'Job creation timestamp' })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Job start timestamp',
    nullable: true,
  })
  @Expose()
  startedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Job completion timestamp',
    nullable: true,
  })
  @Expose()
  completedAt: Date | null;
}

export class CreateJobDto {
  @ApiProperty({
    enum: Object.values(AsyncJobType),
    description: 'Type of job to create',
  })
  jobType: AsyncJobType;

  @ApiProperty({ description: 'Project/Workspace ID' })
  projectId: number;

  @ApiPropertyOptional({ description: 'Additional job data' })
  data?: object;
}

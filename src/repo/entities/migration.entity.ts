import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Tracks which migrations have been applied to the database.
 * Each row represents a successfully executed migration file.
 */
@Entity({ name: 'Migrations' })
@Index('IDX_MIGRATION_NAME', ['Name'], { unique: true })
export class Migration extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  MigrationID: number;

  @ApiProperty()
  @Column({ length: 255, nullable: false, unique: true })
  Name: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  Checksum: string;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  AppliedAt: Date;
}

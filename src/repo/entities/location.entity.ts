import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Location entity - represents a geographic location for companies/persons.
 * Deduplicated by NormalizedKey (lowercase concatenation of country+region+city).
 */
@Entity({ name: 'Locations' })
@Index('IDX_LOCATION_NORMALIZED_KEY', ['NormalizedKey'], { unique: true })
@Index('IDX_LOCATION_COUNTRY_CODE', ['CountryCode'])
export class Location extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  LocationID: number;

  @ApiProperty()
  @Column({ length: 128, nullable: true })
  Country: string;

  @ApiProperty()
  @Column({ length: 8, nullable: true })
  CountryCode: string;

  @ApiProperty()
  @Column({ length: 128, nullable: true })
  City: string;

  @ApiProperty()
  @Column({ length: 128, nullable: true })
  Region: string;

  @ApiProperty({
    description: 'Human-readable display name (e.g., "San Francisco, CA, USA")',
  })
  @Column({ length: 512, nullable: true })
  DisplayName: string;

  @ApiProperty({ description: 'Unique normalized key for deduplication' })
  @Column({ length: 512, nullable: false, unique: true })
  NormalizedKey: string;

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
}

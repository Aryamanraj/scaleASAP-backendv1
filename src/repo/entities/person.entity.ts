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
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Location } from './location.entity';
import { EntityStatus } from '../../common/constants/entity.constants';

/**
 * Person entity - globally unique individuals tracked across projects.
 * Uniqueness enforced by LinkedinUrl (required, unique).
 */
@Entity({ name: 'Persons' })
@Index('IDX_PERSON_LINKEDIN_URL', ['LinkedinUrl'], { unique: true })
@Index('IDX_PERSON_EXTERNAL_URN', ['ExternalUrn'])
@Index('IDX_PERSON_CURRENT_ORG', ['CurrentOrganizationID'])
@Index('IDX_PERSON_LOCATION', ['LocationID'])
export class Person extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PersonID: number;

  @ApiProperty({
    description: 'Normalized LinkedIn profile URL - globally unique',
  })
  @Column({ length: 512, nullable: false, unique: true })
  LinkedinUrl: string;

  @ApiProperty({ description: 'LinkedIn slug/username portion of URL' })
  @Column({ length: 128, nullable: true })
  LinkedinSlug: string;

  @ApiProperty({
    description: 'External URN from LinkedIn (e.g., urn:li:fsd_profile:...)',
  })
  @Column({ length: 128, nullable: true })
  ExternalUrn: string;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  PrimaryDisplayName: string;

  @ApiProperty()
  @Column({ length: 128, nullable: true })
  FirstName: string;

  @ApiProperty()
  @Column({ length: 128, nullable: true })
  LastName: string;

  @ApiProperty({ description: 'Professional headline from LinkedIn' })
  @Column({ length: 512, nullable: true })
  Headline: string;

  @ApiProperty({ description: 'Subtitle/tagline' })
  @Column({ length: 512, nullable: true })
  SubTitle: string;

  @ApiProperty({ enum: Object.values(EntityStatus) })
  @Column({
    type: 'enum',
    enum: EntityStatus,
    default: EntityStatus.ACTIVE,
  })
  Status: EntityStatus;

  @ApiProperty({ description: 'Current employer organization' })
  @Column({ type: 'bigint', nullable: true })
  CurrentOrganizationID: number | null;

  @ApiProperty({ description: 'Person location' })
  @Column({ type: 'bigint', nullable: true })
  LocationID: number | null;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  CreatedByUserID: number | null;

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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'CreatedByUserID' })
  CreatedByUser: User;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'CurrentOrganizationID' })
  CurrentOrganization: Organization;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'LocationID' })
  Location: Location;
}

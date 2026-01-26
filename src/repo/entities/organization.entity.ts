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
import { Location } from './location.entity';
import {
  CompanySizeRange,
  CompanyType,
} from '../../common/constants/entity.constants';

/**
 * Organization entity - represents a prospect/employer company (NOT a scaleASAP client).
 * Deduplicated by: LinkedinCompanyUrn > LinkedinCompanyId > Domain > Name+LocationID fallback.
 */
@Entity({ name: 'Organizations' })
@Index('IDX_ORG_LINKEDIN_COMPANY_URN', ['LinkedinCompanyUrn'], {
  unique: true,
  where: '"LinkedinCompanyUrn" IS NOT NULL',
})
@Index('IDX_ORG_LINKEDIN_COMPANY_ID', ['LinkedinCompanyId'])
@Index('IDX_ORG_DOMAIN', ['Domain'], {
  unique: true,
  where: '"Domain" IS NOT NULL',
})
@Index('IDX_ORG_NAME_NORMALIZED', ['NameNormalized'])
@Index('IDX_ORG_LOCATION', ['LocationID'])
export class Organization extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  OrganizationID: number;

  @ApiProperty()
  @Column({ length: 512, nullable: false })
  Name: string;

  @ApiProperty({ description: 'Lowercase normalized name for search/matching' })
  @Column({ length: 512, nullable: true })
  NameNormalized: string;

  @ApiProperty({ description: 'Company domain (e.g., "example.com")' })
  @Column({ length: 255, nullable: true })
  Domain: string;

  @ApiProperty({ description: 'Full website URL' })
  @Column({ length: 512, nullable: true })
  Website: string;

  @ApiProperty({ description: 'LinkedIn company page URL' })
  @Column({ length: 512, nullable: true })
  LinkedinUrl: string;

  @ApiProperty({ description: 'LinkedIn numeric company ID' })
  @Column({ length: 64, nullable: true })
  LinkedinCompanyId: string;

  @ApiProperty({
    description: 'LinkedIn company URN (e.g., "urn:li:fsd_company:12345")',
  })
  @Column({ length: 128, nullable: true })
  LinkedinCompanyUrn: string;

  @ApiProperty({ description: 'Industry classification' })
  @Column({ length: 255, nullable: true })
  Industry: string;

  @ApiProperty({ enum: CompanySizeRange, description: 'Employee count range' })
  @Column({
    type: 'enum',
    enum: CompanySizeRange,
    nullable: true,
  })
  SizeRange: CompanySizeRange;

  @ApiProperty({ description: 'Year company was founded' })
  @Column({ type: 'int', nullable: true })
  FoundedYear: number;

  @ApiProperty({
    enum: CompanyType,
    description: 'Company type classification',
  })
  @Column({
    type: 'enum',
    enum: CompanyType,
    nullable: true,
  })
  Type: CompanyType;

  @ApiProperty({
    description: 'Inferred annual revenue (string representation)',
  })
  @Column({ length: 128, nullable: true })
  InferredRevenue: string;

  @ApiProperty({ description: 'Total funding raised (string representation)' })
  @Column({ length: 128, nullable: true })
  TotalFundingRaised: string;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: true })
  LocationID: number | null;

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

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'LocationID' })
  Location: Location;
}

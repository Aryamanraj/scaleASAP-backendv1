import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'Companies' })
export class Company extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  CompanyID: number;

  @ApiProperty()
  @Column({ length: 255, nullable: false })
  Name: string;

  @ApiProperty()
  @Column({ length: 64, nullable: true, unique: true })
  Slug: string;

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

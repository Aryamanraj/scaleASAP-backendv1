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
import { Client } from './client.entity';
import { ProjectStatus } from '../../common/constants/entity.constants';

@Entity({ name: 'Projects' })
@Index(['ClientID', 'Status'])
export class Project extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ClientID: number;

  @ApiProperty()
  @Column({ length: 255, nullable: false })
  Name: string;

  @ApiProperty({ enum: Object.values(ProjectStatus) })
  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  Status: ProjectStatus;

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

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'ClientID' })
  Client: Client;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Client } from './client.entity';
import {
  UserRole,
  EntityStatus,
} from '../../common/constants/entity.constants';

@Entity({ name: 'Users' })
export class User extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  UserID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ClientID: number;

  @ApiProperty()
  @Column({ length: 255, unique: true, nullable: false })
  Email: string;

  @ApiProperty()
  @Column({ length: 255, nullable: false })
  Name: string;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  PasswordHash: string;

  @ApiProperty({ enum: Object.values(UserRole) })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  Role: UserRole;

  @ApiProperty({ enum: Object.values(EntityStatus) })
  @Column({
    type: 'enum',
    enum: EntityStatus,
    default: EntityStatus.ACTIVE,
  })
  Status: EntityStatus;

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

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
import { User } from './user.entity';
import { EntityStatus } from '../../common/constants/entity.constants';

@Entity({ name: 'Persons' })
export class Person extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PersonID: number;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  PrimaryDisplayName: string;

  @ApiProperty({ enum: Object.values(EntityStatus) })
  @Column({
    type: 'enum',
    enum: EntityStatus,
    default: EntityStatus.ACTIVE,
  })
  Status: EntityStatus;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  CreatedByUserID: number;

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
}

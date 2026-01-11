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
import { Project } from './project.entity';
import { User } from './user.entity';
import { ProjectUserRole } from '../../common/constants/entity.constants';

@Entity({ name: 'ProjectUsers' })
@Index(['ProjectID', 'UserID'])
export class ProjectUser extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ProjectUserID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  UserID: number;

  @ApiProperty({ enum: Object.values(ProjectUserRole) })
  @Column({
    type: 'enum',
    enum: ProjectUserRole,
    default: ProjectUserRole.MEMBER,
  })
  ProjectRole: ProjectUserRole;

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

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'UserID' })
  User: User;
}

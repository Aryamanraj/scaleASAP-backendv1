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
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Person } from './person.entity';
import { Project } from './project.entity';
import { User } from './user.entity';

@Entity({ name: 'PersonProjects' })
@Unique('UQ_PERSON_PROJECT', ['ProjectID', 'PersonID'])
@Index(['PersonID', 'ProjectID'])
export class PersonProject extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  PersonProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PersonID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ length: 64, nullable: true })
  Tag: string;

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

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'PersonID' })
  Person: Person;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'ProjectID' })
  Project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'CreatedByUserID' })
  CreatedByUser: User;
}

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
import { Person } from './person.entity';
import { ModuleRun } from './module-run.entity';

@Entity({ name: 'LayerSnapshots' })
@Index(['ProjectID', 'PersonID', 'LayerNumber', 'SnapshotVersion'])
export class LayerSnapshot extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  LayerSnapshotID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ProjectID: number;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  PersonID: number;

  @ApiProperty()
  @Column({ type: 'int', nullable: false })
  LayerNumber: number;

  @ApiProperty()
  @Column({ type: 'int', nullable: false })
  SnapshotVersion: number;

  @ApiProperty()
  @Column({ length: 128, nullable: false })
  ComposerModuleKey: string;

  @ApiProperty()
  @Column({ length: 32, nullable: false })
  ComposerVersion: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: false })
  CompiledJson: any;

  @ApiProperty()
  @Column({ type: 'timestamp with time zone', nullable: false })
  GeneratedAt: Date;

  @ApiProperty()
  @Column({ type: 'bigint', nullable: false })
  ModuleRunID: number;

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

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'PersonID' })
  Person: Person;

  @ManyToOne(() => ModuleRun)
  @JoinColumn({ name: 'ModuleRunID' })
  ModuleRun: ModuleRun;
}

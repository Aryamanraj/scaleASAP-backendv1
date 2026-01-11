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
import { ModuleType } from '../../common/constants/entity.constants';

@Entity({ name: 'Modules' })
@Index(['ModuleKey', 'Version'])
export class Module extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  ModuleID: number;

  @ApiProperty()
  @Column({ length: 128, nullable: false })
  ModuleKey: string;

  @ApiProperty({ enum: Object.values(ModuleType) })
  @Column({
    type: 'enum',
    enum: ModuleType,
    nullable: false,
  })
  ModuleType: ModuleType;

  @ApiProperty()
  @Column({ length: 32, nullable: false })
  Version: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  ConfigSchemaJson: any;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  IsEnabled: boolean;

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

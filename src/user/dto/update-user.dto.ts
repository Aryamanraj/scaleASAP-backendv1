import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  UserRole,
  EntityStatus,
} from '../../common/constants/entity.constants';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'User role',
    enum: Object.values(UserRole),
    example: UserRole.ADMIN,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'User status',
    enum: Object.values(EntityStatus),
    example: EntityStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiProperty({
    description: 'User password hash',
    example: 'new_hashed_password_string',
    required: false,
  })
  @IsOptional()
  @IsString()
  passwordHash?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  UserRole,
  EntityStatus,
} from '../../common/constants/entity.constants';

export class CreateUserDto {
  @ApiProperty({
    description: 'Company ID',
    example: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  companyId: number;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User password hash',
    example: 'hashed_password_string',
    required: false,
  })
  @IsOptional()
  @IsString()
  passwordHash?: string;

  @ApiProperty({
    description: 'User role',
    enum: Object.values(UserRole),
    example: UserRole.MEMBER,
    required: false,
    default: UserRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    description: 'User status',
    enum: Object.values(EntityStatus),
    example: EntityStatus.ACTIVE,
    required: false,
    default: EntityStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

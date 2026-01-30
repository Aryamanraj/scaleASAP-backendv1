import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectUserRole } from '../../common/constants/entity.constants';

export class AddMemberDto {
  @ApiProperty({
    description: 'Email of the user to add as member',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the member',
    enum: Object.values(ProjectUserRole),
    example: ProjectUserRole.MEMBER,
  })
  @IsEnum(ProjectUserRole)
  role: ProjectUserRole;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ProjectUserRole } from '../../common/constants/entity.constants';

export class AddUserToProjectDto {
  @ApiProperty({
    description: 'Project role for the user',
    enum: Object.values(ProjectUserRole),
    example: ProjectUserRole.MEMBER,
    required: false,
    default: ProjectUserRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(ProjectUserRole)
  projectRole?: ProjectUserRole;
}

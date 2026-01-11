import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '../../common/constants/entity.constants';

export class UpdateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Research Project Alpha',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Project status',
    enum: Object.values(ProjectStatus),
    example: ProjectStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ProjectStatus,
  OnboardingStatus,
} from '../../common/constants/entity.constants';

export class ChatMessageDto {
  @ApiProperty({ description: 'Message role', enum: ['user', 'assistant'] })
  @Expose()
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content' })
  @Expose()
  content: string;
}

export class WorkspaceMemberDto {
  @ApiProperty({ description: 'User ID' })
  @Expose()
  userId: number;

  @ApiProperty({ description: 'User name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'User email' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Role in workspace' })
  @Expose()
  role: string;
}

export class WorkspaceResponseDto {
  @ApiProperty({ description: 'Workspace ID' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Workspace name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @Expose()
  website?: string;

  @ApiPropertyOptional({ description: 'Company favicon URL' })
  @Expose()
  faviconUrl?: string;

  @ApiProperty({
    description: 'Workspace status',
    enum: Object.values(ProjectStatus),
  })
  @Expose()
  status: ProjectStatus;

  @ApiProperty({
    description: 'Onboarding completion status',
    enum: Object.values(OnboardingStatus),
  })
  @Expose()
  onboardingStatus: OnboardingStatus;

  @ApiPropertyOptional({
    description: 'Discovery chat history',
    type: [ChatMessageDto],
  })
  @Expose()
  @Type(() => ChatMessageDto)
  discoveryChatHistory?: ChatMessageDto[];

  @ApiPropertyOptional({ description: 'Workspace settings' })
  @Expose()
  settings?: object;

  @ApiPropertyOptional({ description: 'Owner user ID' })
  @Expose()
  ownerUserId?: number;

  @ApiProperty({ description: 'Created at timestamp' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Workspace members',
    type: [WorkspaceMemberDto],
  })
  @Expose()
  @Type(() => WorkspaceMemberDto)
  members?: WorkspaceMemberDto[];
}

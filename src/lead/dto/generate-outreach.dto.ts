import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  MessagePlatform,
  MessageType,
} from '../../repo/entities/generated-message.entity';

export class GenerateOutreachDto {
  @ApiProperty({
    enum: MessagePlatform,
    description: 'Platform for the message',
    example: 'linkedin',
  })
  @IsEnum(MessagePlatform)
  @IsNotEmpty()
  platform: MessagePlatform;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message to generate',
    example: 'connection_request',
  })
  @IsEnum(MessageType)
  @IsNotEmpty()
  messageType: MessageType;

  @ApiPropertyOptional({
    description:
      'Additional context for message generation (e.g., user response to address)',
    example: 'They mentioned they are struggling with outbound',
  })
  @IsString()
  @IsOptional()
  context?: string;
}

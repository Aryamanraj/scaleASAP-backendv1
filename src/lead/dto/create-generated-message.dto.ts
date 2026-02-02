import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import {
  MessagePlatform,
  MessageType,
} from '../../repo/entities/generated-message.entity';

export class CreateGeneratedMessageDto {
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
    description: 'Type of message',
    example: 'connection_request',
  })
  @IsEnum(MessageType)
  @IsNotEmpty()
  messageType: MessageType;

  @ApiProperty({
    description: 'The generated message content',
    example: 'Hey John—saw your post about scaling sales teams...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'User-provided context for generation',
    example: 'Follow up on previous conversation about pricing',
  })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({
    description: 'AI reasoning/thinking process',
    example: {
      hook: 'Recent post',
      question: 'About their scaling challenges',
    },
  })
  @IsObject()
  @IsOptional()
  thinking?: object;
}

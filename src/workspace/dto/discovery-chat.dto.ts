import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DiscoveryChatMessageDto {
  @ApiProperty({ description: 'Message role', enum: ['user', 'assistant'] })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;
}

export class PreviousExperimentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trigger?: string;
}

export class DiscoveryChatDto {
  @ApiProperty({
    description: 'Chat messages',
    type: [DiscoveryChatMessageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscoveryChatMessageDto)
  messages: DiscoveryChatMessageDto[];

  @ApiPropertyOptional({ description: 'Whether this is a follow-up session' })
  @IsOptional()
  @IsBoolean()
  isFollowUp?: boolean;

  @ApiPropertyOptional({ description: 'Previous experiments for follow-up' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviousExperimentDto)
  previousExperiments?: PreviousExperimentDto[];

  @ApiPropertyOptional({ description: 'User name for personalization' })
  @IsOptional()
  @IsString()
  userName?: string;
}

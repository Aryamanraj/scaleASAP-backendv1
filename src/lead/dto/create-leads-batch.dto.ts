import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLeadDto } from './create-lead.dto';

export class CreateLeadsBatchDto {
  @ApiProperty({
    description: 'Campaign ID to add leads to',
    example: 1,
  })
  @IsInt()
  campaignId: number;

  @ApiProperty({
    description: 'Array of leads to create',
    type: [CreateLeadDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one lead is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateLeadDto)
  leads: CreateLeadDto[];
}

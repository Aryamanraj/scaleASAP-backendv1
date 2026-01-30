import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateExperimentDto } from './create-experiment.dto';

export class CreateExperimentsBatchDto {
  @ApiProperty({
    description: 'Workspace ID to create experiments in',
    example: 1,
  })
  @IsInt()
  workspaceId: number;

  @ApiProperty({
    description: 'Array of experiments to create',
    type: [CreateExperimentDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one experiment is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateExperimentDto)
  experiments: CreateExperimentDto[];
}

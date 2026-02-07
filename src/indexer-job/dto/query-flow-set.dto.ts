import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class QueryFlowSetDto {
  @ApiProperty({ description: 'Flow set id to query against' })
  @IsString()
  @IsNotEmpty()
  flowSetId: string;

  @ApiProperty({ description: 'Question to answer using composed data' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question: string;
}

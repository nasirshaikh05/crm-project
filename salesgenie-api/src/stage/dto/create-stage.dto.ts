import { IsString, IsNotEmpty, MaxLength, IsUUID, IsInt, Min, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStageDto {
  @ApiProperty({ description: 'The UUID of the queue this stage belongs to', format: 'uuid', example: 'q-uuid-example' })
  @IsUUID()
  @IsNotEmpty()
  queueId: string;

  @ApiProperty({ description: 'The name of this stage/column', maxLength: 255, example: 'In Negotiation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'The order index of the stage in the queue (0-indexed)', minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiPropertyOptional({ description: 'List of step UUIDs to assign to this stage', type: [String], example: ['step-uuid-1'] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  stepIds?: string[];
}

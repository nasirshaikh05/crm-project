import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransitionTargetType } from '../entities/step-button-transition.entity';

export class ConfigureTransitionDto {
  @ApiProperty({ description: 'The routing target type to trigger on button click', enum: TransitionTargetType, example: TransitionTargetType.NEXT_STEP })
  @IsEnum(TransitionTargetType)
  @IsNotEmpty()
  targetType: TransitionTargetType;

  @ApiPropertyOptional({ description: 'The UUID of the specific Step to route to (for specific_step targetType)', format: 'uuid', example: 'step-uuid-example' })
  @IsUUID()
  @IsOptional()
  targetStepId?: string;

  @ApiPropertyOptional({ description: 'The UUID of the specific Stage to route to (for specific_stage targetType)', format: 'uuid', example: 'stage-uuid-example' })
  @IsUUID()
  @IsOptional()
  targetStageId?: string;

  @ApiPropertyOptional({ description: 'The UUID of the specific Queue to route to (for specific_queue targetType)', format: 'uuid', example: 'queue-uuid-example' })
  @IsUUID()
  @IsOptional()
  targetQueueId?: string;
}

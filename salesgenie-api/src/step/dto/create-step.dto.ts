import { IsString, IsNotEmpty, MaxLength, IsUUID, IsInt, Min, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepActionType } from '../entities/step.entity';

class StepActionContentDto {
  @ApiPropertyOptional({ description: 'The subject line for email communications', example: 'Welcome to our CRM!' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ description: 'The main message body for email or text/whatsapp message', example: 'Hi John, thank you for signing up.' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({ description: 'Optional attachment download URL', example: 'https://example.com/files/brochure.pdf' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: 'Optional video resource embed URL', example: 'https://youtube.com/embed/example' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Custom JSON key-value store for storing arbitrary workflow metadata', example: { formFields: ['name', 'budget'] } })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateStepDto {

  @ApiProperty({ description: 'The title/name of the step task', maxLength: 255, example: 'Send Proposal Email' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'The order index of the step in the stage (0-indexed)', minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiProperty({ description: 'The type of automation execution task for this step', enum: StepActionType, example: StepActionType.SEND_EMAIL_WITH_BUTTONS })
  @IsEnum(StepActionType)
  actionType: StepActionType;

  @ApiPropertyOptional({ description: 'The UUID of the stage this step belongs to', format: 'uuid', example: 'uuid-here' })
  @IsUUID()
  @IsOptional()
  stageId?: string;

  @ApiPropertyOptional({ description: 'Rich content structure linked with automated actions', type: StepActionContentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepActionContentDto)
  actionContent?: StepActionContentDto;
}

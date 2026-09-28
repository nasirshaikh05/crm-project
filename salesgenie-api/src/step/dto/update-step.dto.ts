import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, Min, IsEnum, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { StepActionType } from '../entities/step.entity';

class StepActionContentDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateStepDto {

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @IsEnum(StepActionType)
  @IsOptional()
  actionType?: StepActionType;

  @IsUUID()
  @IsOptional()
  stageId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StepActionContentDto)
  actionContent?: StepActionContentDto;
}

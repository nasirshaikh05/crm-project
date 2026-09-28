import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, IsBoolean, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFormDto {
  @ApiPropertyOptional({ description: 'The title of the form', example: 'Updated Newsletter Signup' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the form', example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Fields schema configurations', example: [{ name: 'email', label: 'Email', type: 'email', required: true }] })
  @IsArray()
  @IsOptional()
  fields?: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Design styling configurations for the form', example: { theme: 'dark', primaryColor: '#ff0000' } })
  @IsObject()
  @IsOptional()
  design?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether the form is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'The purpose or action mapping of the form', enum: ['lead_creation', 'lead_update', 'generic'], default: 'generic' })
  @IsString()
  @IsIn(['lead_creation', 'lead_update', 'generic'])
  @IsOptional()
  purpose?: 'lead_creation' | 'lead_update' | 'generic';

  @ApiPropertyOptional({ description: 'The target pipeline step to move the lead to upon success transition', example: { queueId: 'uuid', stageId: 'uuid', stepId: 'uuid' } })
  @IsObject()
  @IsOptional()
  onSuccessTransition?: {
    queueId?: string;
    stageId?: string;
    stepId?: string;
  } | null;
}

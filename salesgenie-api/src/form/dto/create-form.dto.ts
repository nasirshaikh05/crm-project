import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFormDto {
  @ApiProperty({ description: 'The title of the form', example: 'Newsletter Signup' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the form', example: 'Subscribe to get weekly updates' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Fields schema configurations', example: [{ name: 'email', label: 'Email', type: 'email', required: true }] })
  @IsArray()
  fields: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Design styling configurations for the form', example: { theme: 'light', primaryColor: '#007bff' } })
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
  };
}

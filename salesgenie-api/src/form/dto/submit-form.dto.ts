import { IsNotEmpty, IsObject, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFormDto {
  @ApiPropertyOptional({ description: 'The UUID of the associated Lead (for updates or tracking)', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiProperty({ description: 'Key-value map containing the answers to the form fields', example: { email: 'john@example.com', feedback: 'Great service!' } })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, any>;
}

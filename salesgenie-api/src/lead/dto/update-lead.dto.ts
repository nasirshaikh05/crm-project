import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLeadDto {
  @ApiPropertyOptional({ description: 'The first name of the lead', example: 'Alice' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({ description: 'The last name of the lead', example: 'Smith' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({ description: 'The email address of the lead', example: 'alice.smith@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'The phone number of the lead', example: '+1555019988' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'The suburb of the lead', example: 'Surry Hills' })
  @IsString()
  @IsOptional()
  suburb?: string;

  @ApiPropertyOptional({ description: 'The postcode of the lead', example: '2010' })
  @IsString()
  @IsOptional()
  postcode?: string;

  @ApiPropertyOptional({ description: 'The state of the lead', example: 'NSW' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'Status of the lead (active, converted, lost)', example: 'active' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'The current Queue UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentQueueId?: string;

  @ApiPropertyOptional({ description: 'The current Stage UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentStageId?: string;

  @ApiPropertyOptional({ description: 'The current Step UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentStepId?: string;

  @ApiPropertyOptional({ description: 'Notes related to the lead', example: 'Follow up call scheduled' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Attachments related to the lead', example: ['https://example.com/contract.pdf'] })
  @IsArray()
  @IsOptional()
  attachments?: any[];
}

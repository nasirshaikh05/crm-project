import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({ description: 'The first name of the lead', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'The last name of the lead', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'The email address of the lead', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The phone number of the lead', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Whether to send welcome email notification', default: true })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to send welcome SMS notification', default: true })
  @IsBoolean()
  @IsOptional()
  sendSms?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to send welcome WhatsApp notification', default: true })
  @IsBoolean()
  @IsOptional()
  sendWhatsapp?: boolean = true;

  @ApiPropertyOptional({ description: 'Explicit UUID of the Queue to place the lead in. Omit for default placement.', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentQueueId?: string;

  @ApiPropertyOptional({ description: 'Explicit UUID of the Stage to place the lead in. Omit for default placement.', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentStageId?: string;

  @ApiPropertyOptional({ description: 'Explicit UUID of the Step to place the lead in. Omit for default placement.', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentStepId?: string;

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

  @ApiPropertyOptional({ description: 'Custom creation date for the lead', example: '2026-08-10T12:00:00Z' })
  @IsOptional()
  date?: Date | string;
}

import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'The first name of the customer', example: 'Alice' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({ description: 'The last name of the customer', example: 'Smith' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({ description: 'The email address of the customer', example: 'alice.smith@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'The phone number of the customer', example: '+1555019988' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Status of the customer', example: 'active' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'The suburb of the customer', example: 'Richmond' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  suburb?: string;

  @ApiPropertyOptional({ description: 'The state of the customer', example: 'VIC' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  state?: string;

  @ApiPropertyOptional({ description: 'The postcode of the customer', example: '3121' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  postcode?: string;

  @ApiPropertyOptional({ description: 'The Queue UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentQueueId?: string;

  @ApiPropertyOptional({ description: 'The Stage UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentStageId?: string;

  @ApiPropertyOptional({ description: 'The Step UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  currentStepId?: string;

  @ApiPropertyOptional({ description: 'The Account Manager User UUID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  accountManagerId?: string;

  @ApiPropertyOptional({ description: 'Contract start date', example: '2026-08-01' })
  @IsDateString()
  @IsOptional()
  contractStartDate?: string;
}

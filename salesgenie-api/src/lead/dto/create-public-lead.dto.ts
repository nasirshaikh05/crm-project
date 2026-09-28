import { IsEmail, IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublicLeadDto {
  @ApiProperty({ description: 'The first name of the lead', example: 'Alice', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({ description: 'The last name of the lead', example: 'Smith', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiProperty({ description: 'The email address of the lead', example: 'alice.smith@example.com', maxLength: 255 })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'The phone number of the lead', example: '+1555019988', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phoneNumber: string;

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

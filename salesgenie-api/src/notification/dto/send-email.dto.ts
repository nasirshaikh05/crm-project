import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'The recipient email address', example: 'client@example.com' })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'The subject of the email', example: 'Project Update' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'The body of the email', example: 'Hello, this is a custom email update from the CRM.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}

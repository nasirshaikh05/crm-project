import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'staff@example.com', description: 'The email of the staff/user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'The password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'my-workspace', description: 'The workspace of the user', required: false })
  @IsString()
  @IsOptional()
  workspace?: string;

  @ApiProperty({ example: 'John', description: 'The first name of the user', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', description: 'The last name of the user', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;
}

import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'The name of the workspace', example: 'Default Workspace' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Organization name for workspace customization', example: 'Airnet CRM Inc' })
  @IsString()
  @IsOptional()
  orgName?: string;

  @ApiPropertyOptional({ description: 'Logo URL for workspace customization', example: 'https://example.com/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}

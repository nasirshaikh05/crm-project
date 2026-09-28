import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ description: 'The name of the workspace' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Organization name for workspace customization' })
  @IsString()
  @IsOptional()
  orgName?: string;

  @ApiPropertyOptional({ description: 'Logo URL for workspace customization' })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}

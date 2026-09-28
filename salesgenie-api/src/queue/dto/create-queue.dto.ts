import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQueueDto {
  @ApiProperty({ description: 'The name of the pipeline queue', maxLength: 255, example: 'Enterprise Funnel' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'A detailed description of the pipeline funnel', example: 'For business deals exceeding $50k' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this pipeline is active and accepting new leads', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

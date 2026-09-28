import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateButtonDto {
  @ApiProperty({ description: 'The text label displayed on the button', maxLength: 100, example: 'Yes, I am interested' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({ description: 'The display order of this button relative to others on the same step (0-indexed)', minimum: 0, example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

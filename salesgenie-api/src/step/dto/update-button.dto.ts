import { IsString, IsNotEmpty, MaxLength, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateButtonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  label?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

import { IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, Min, IsArray, IsUUID } from 'class-validator';

export class UpdateStageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  stepIds?: string[];
}

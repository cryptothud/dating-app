import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'

export class CreateSafetyDateDto {
  @IsOptional() @IsString() trustedContactPhone?: string
  @IsOptional() @IsString() trustedContactEmail?: string

  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes!: number
}

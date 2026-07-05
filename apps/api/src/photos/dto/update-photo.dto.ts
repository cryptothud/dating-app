import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator'

export class UpdatePhotoDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @IsOptional()
  @IsBoolean()
  blurEnabled?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}

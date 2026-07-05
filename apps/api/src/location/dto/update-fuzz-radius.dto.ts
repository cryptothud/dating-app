import { IsInt, Min, Max } from 'class-validator'

export class UpdateFuzzRadiusDto {
  @IsInt()
  @Min(200)
  @Max(2000)
  fuzzRadius!: number
}

import { IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class MapEventsQueryDto {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) swLat!: number
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) swLng!: number
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) neLat!: number
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) neLng!: number
}

import {
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsArray,
  IsString,
  IsInt,
  IsIn,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

export class MapQueryDto {
  @Type((): NumberConstructor => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  swLat!: number

  @Type((): NumberConstructor => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  swLng!: number

  @Type((): NumberConstructor => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  neLat!: number

  @Type((): NumberConstructor => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  neLng!: number

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  ageMin?: number

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  ageMax?: number

  // Query params arrive as string or string[] depending on the client
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : value ? [String(value)] : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  lookingFor?: string[]

  @IsOptional()
  @Transform(({ value }: { value: unknown }): boolean => value === 'true' || value === true)
  @IsBoolean()
  activelyOnly?: boolean

  @IsOptional()
  @IsIn(['slim', 'athletic', 'average', 'muscular', 'curvy', 'full'])
  bodyType?: string

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value) ? value : value ? [String(value)] : undefined,
  )
  @IsArray()
  @IsString({ each: true })
  interests?: string[]

  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(0)
  @Max(22)
  zoom?: number
}

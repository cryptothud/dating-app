import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  IsIn,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'

const VALID_LOOKING_FOR = ['casual', 'dating', 'friendship', 'hookup', 'relationship'] as const
const VALID_BODY_TYPES = ['slim', 'athletic', 'average', 'muscular', 'curvy', 'full'] as const
const VALID_SEXUALITY = [
  'straight',
  'gay',
  'lesbian',
  'bisexual',
  'pansexual',
  'queer',
  'curious',
  'trans',
  'asexual',
  'other',
] as const

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @IsOptional()
  @IsBoolean()
  nsfwEnabled?: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsIn(VALID_LOOKING_FOR, { each: true })
  lookingFor?: string[]

  @IsOptional()
  @IsString()
  @IsIn(VALID_BODY_TYPES)
  bodyType?: string

  @IsOptional()
  @IsString()
  @IsIn(VALID_SEXUALITY)
  sexuality?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  interests?: string[]

  // Accepted only when the account has no dateOfBirth — derives age for legacy accounts
  @IsOptional()
  @Type((): NumberConstructor => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  age?: number
}

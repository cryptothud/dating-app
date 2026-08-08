import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsInt,
  IsDateString,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type((): NumberConstructor => Number)
  latitude!: number

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type((): NumberConstructor => Number)
  longitude!: number

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayArea?: string

  @IsDateString()
  scheduledAt!: string

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(500)
  @Type((): NumberConstructor => Number)
  maxAttendees?: number
}

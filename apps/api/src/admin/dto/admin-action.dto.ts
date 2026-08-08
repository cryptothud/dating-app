import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsIn,
  IsUrl,
  IsPositive,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ReasonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string
}

export class TicketReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string
}

export class TicketStatusDto {
  @IsIn(['open', 'pending', 'closed'])
  status!: string
}

export class MaintenanceModeDto {
  @IsBoolean()
  enabled!: boolean
}

export class FlushCacheDto {
  @IsString()
  @MinLength(1)
  pattern!: string
}

export class UpdateFlagDto {
  @IsBoolean()
  enabled!: boolean

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string
}

export class BroadcastPushDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  body!: string

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  url?: string
}

export class TimeoutDto {
  @IsInt()
  @IsPositive()
  @Max(43200) // max 30 days in minutes
  durationMinutes!: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

export class SetRoleDto {
  @IsIn(['user', 'moderator', 'admin'])
  role!: string
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number

  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  action?: string

  @IsOptional()
  @IsString()
  adminId?: string

  @IsOptional()
  @IsString()
  targetUserId?: string
}

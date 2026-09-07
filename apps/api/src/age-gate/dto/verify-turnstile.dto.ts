import { IsString, MaxLength, MinLength } from 'class-validator'

// Cloudflare documents the token as at most 2048 characters.
const MAX_TOKEN_LENGTH = 2048

export class VerifyTurnstileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TOKEN_LENGTH)
  token!: string
}

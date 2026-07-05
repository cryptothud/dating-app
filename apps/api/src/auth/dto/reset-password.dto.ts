import { IsString, MinLength, Matches } from 'class-validator'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

export class ResetPasswordDto {
  @IsString()
  token!: string

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: 'password must contain uppercase, lowercase, and a number' })
  password!: string
}

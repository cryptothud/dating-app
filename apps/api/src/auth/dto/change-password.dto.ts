import { IsString, MinLength, Matches } from 'class-validator'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: 'newPassword must contain uppercase, lowercase, and a number' })
  newPassword!: string
}

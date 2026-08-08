import { IsEmail, IsString, MinLength, Matches, IsDateString } from 'class-validator'

export class SignupDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string

  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone must be in E.164 format (e.g. +12125551234)' })
  phone!: string

  @IsDateString()
  dateOfBirth!: string
}

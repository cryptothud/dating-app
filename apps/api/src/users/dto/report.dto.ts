import { IsString, IsEnum, MaxLength } from 'class-validator'

export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  UNDERAGE = 'UNDERAGE',
  CSAM = 'CSAM',
  FAKE_PROFILE = 'FAKE_PROFILE',
  VIOLENCE = 'VIOLENCE',
  OTHER = 'OTHER',
}

export class ReportDto {
  @IsEnum(ReportReason)
  reason!: ReportReason

  @IsString()
  @MaxLength(1000)
  details!: string
}

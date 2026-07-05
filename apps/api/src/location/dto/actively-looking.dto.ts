import { IsBoolean } from 'class-validator'

export class ActivelyLookingDto {
  @IsBoolean()
  enabled!: boolean
}

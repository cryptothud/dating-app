import { IsString, IsNotEmpty } from 'class-validator'

export class CreateDmDto {
  @IsString()
  @IsNotEmpty()
  otherUserId!: string
}

import { IsString, IsOptional, IsInt, MaxLength, Min } from 'class-validator'

export class UpsertPromptDto {
  @IsString()
  promptKey!: string

  @IsString()
  @MaxLength(200)
  answer!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}

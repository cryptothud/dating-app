import { IsString, IsUrl, ValidateNested, IsObject } from 'class-validator'
import { Type } from 'class-transformer'

class PushKeysDto {
  @IsString() p256dh!: string
  @IsString() auth!: string
}

export class PushSubscribeDto {
  @IsUrl() endpoint!: string
  @IsObject() @ValidateNested() @Type(() => PushKeysDto) keys!: PushKeysDto
}

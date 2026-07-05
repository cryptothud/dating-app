import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { RefreshStrategy } from './strategies/refresh.strategy'
import { TwilioModule } from '../twilio/twilio.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    TwilioModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshStrategy,
  ],
})
export class AuthModule {}

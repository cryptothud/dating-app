import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common'
import { Throttle, SkipThrottle } from '@nestjs/throttler'
import { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RefreshAuthGuard } from './guards/refresh-auth.guard'

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string }
}

interface RefreshRequest extends Request {
  user: { id: string; family: string }
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  @Throttle({ short: { limit: 3, ttl: 60000 }, medium: { limit: 5, ttl: 300000 } })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    return this.auth.signup(dto, res, ip)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 }, medium: { limit: 15, ttl: 300000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.auth.login(dto, res)
  }

  @Post('logout')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  async logout(
    @Req() req: RefreshRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.auth.logout(req.user.id, req.user.family, res)
  }

  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: RefreshRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.auth.refresh(req.user.id, req.user.family, res)
  }

  @Post('otp/send')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendOtp(
    @Req() req: AuthenticatedRequest,
    @Ip() ip: string,
  ): Promise<{ message: string }> {
    const user = await this.auth.getMe(req.user.id) as { phone: string }
    return this.auth.sendOtp(user.phone, ip)
  }

  @Post('otp/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: VerifyOtpDto,
  ): Promise<{ message: string }> {
    return this.auth.verifyOtp(req.user.id, dto.phone, dto.code, res)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: AuthenticatedRequest): Promise<object> {
    return this.auth.getMe(req.user.id)
  }

  @Get('socket-token')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  async getSocketToken(@Req() req: AuthenticatedRequest): Promise<{ token: string }> {
    return this.auth.getSocketToken(req.user.id)
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 2, ttl: 60000 }, medium: { limit: 5, ttl: 3600000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.auth.forgotPassword(dto.email)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.auth.resetPassword(dto.token, dto.password)
  }

}

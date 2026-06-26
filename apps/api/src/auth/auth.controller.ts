import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
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
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.auth.signup(dto, res)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.auth.login(dto, res)
  }

  @Post('logout')
  @UseGuards(RefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
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
    @Body() dto: VerifyOtpDto,
  ): Promise<{ message: string }> {
    return this.auth.verifyOtp(req.user.id, dto.phone, dto.code)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: AuthenticatedRequest): Promise<object> {
    return this.auth.getMe(req.user.id)
  }
}

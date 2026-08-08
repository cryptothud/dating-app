import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'
import { Request, Response } from 'express'
import { AdminGuard } from './admin.guard'
import { ModeratorGuard } from './moderator.guard'
import { AdminService } from './admin.service'
import {
  ReasonDto,
  TicketReplyDto,
  TicketStatusDto,
  MaintenanceModeDto,
  FlushCacheDto,
  UpdateFlagDto,
  BroadcastPushDto,
  PaginationDto,
  TimeoutDto,
  SetRoleDto,
} from './dto/admin-action.dto'

class AdminLoginDto {
  @IsEmail() email!: string
  @IsString() @MinLength(1) @MaxLength(200) password!: string
}

interface AdminRequest extends Request {
  user: { id: string; role: string }
}

// ── Public endpoints — no auth guard (work during maintenance) ────────
@Controller('admin')
export class AdminPublicController {
  constructor(private admin: AdminService) {}

  @Get('status')
  async getStatus(): Promise<{ maintenance: boolean; }> {
    return this.admin.getMaintenanceStatus()
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response): Promise<{ message: string; }> {
    return this.admin.adminLogin(dto.email, dto.password, res)
  }
}

// ── Protected endpoints — AdminGuard required ─────────────────────────
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────

  @Get('stats')
  async getStats() {
    return this.admin.getDashboardStats()
  }

  // ── Users ──────────────────────────────────────────────────────────

  @Get('users')
  async searchUsers(@Query() q: PaginationDto) {
    return this.admin.searchUsers(q.q ?? '', q.limit ?? 20, q.offset ?? 0)
  }

  @Get('users/banned')
  async getBannedUsers(@Query() q: PaginationDto) {
    return this.admin.getBannedUsers(q.limit ?? 20, q.offset ?? 0)
  }

  @Get('users/timed-out')
  async getTimedOutUsers(@Query() q: PaginationDto) {
    return this.admin.getTimedOutUsers(q.limit ?? 20, q.offset ?? 0)
  }

  @Get('users/elevated')
  async getElevatedUsers() {
    return this.admin.getElevatedUsers()
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.admin.getUserDetail(id)
  }

  @Post('users/:id/warn')
  @HttpCode(HttpStatus.NO_CONTENT)
  async warn(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: ReasonDto): Promise<void> {
    await this.admin.warnUser(req.user.id, id, dto.reason)
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspend(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: ReasonDto): Promise<void> {
    await this.admin.suspendUser(req.user.id, id, dto.reason)
  }

  @Post('users/:id/unsuspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsuspend(@Req() req: AdminRequest, @Param('id') id: string): Promise<void> {
    await this.admin.unsuspendUser(req.user.id, id)
  }

  @Post('users/:id/ban')
  @HttpCode(HttpStatus.NO_CONTENT)
  async ban(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: ReasonDto): Promise<void> {
    await this.admin.banUser(req.user.id, id, dto.reason)
  }

  @Post('users/:id/unban')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unban(@Req() req: AdminRequest, @Param('id') id: string): Promise<void> {
    await this.admin.unbanUser(req.user.id, id)
  }

  @Post('users/:id/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  async verify(@Req() req: AdminRequest, @Param('id') id: string): Promise<void> {
    await this.admin.verifyUser(req.user.id, id)
  }

  @Post('users/:id/force-logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forceLogout(@Req() req: AdminRequest, @Param('id') id: string): Promise<void> {
    await this.admin.forceLogout(req.user.id, id)
  }

  @Post('users/:id/timeout')
  @UseGuards(ModeratorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async timeout(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: TimeoutDto): Promise<void> {
    await this.admin.timeoutUser(req.user.id, id, dto.durationMinutes, dto.reason)
  }

  @Delete('users/:id/timeout')
  @UseGuards(ModeratorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearTimeout(@Req() req: AdminRequest, @Param('id') id: string): Promise<void> {
    await this.admin.clearTimeout(req.user.id, id)
  }

  @Post('users/:id/set-role')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setRole(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: SetRoleDto): Promise<void> {
    await this.admin.setUserRole(req.user.id, id, dto.role)
  }

  // ── Reports ────────────────────────────────────────────────────────

  @Get('reports')
  async getReports(@Query() q: PaginationDto) {
    return this.admin.getReports(q.status ?? 'open', q.limit ?? 20, q.offset ?? 0)
  }

  @Post('reports/:id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resolveReport(@Req() req: AdminRequest, @Param('id') id: string, @Body() dto: ReasonDto): Promise<void> {
    await this.admin.resolveReport(req.user.id, id, dto.reason)
  }

  // ── Support Inbox ──────────────────────────────────────────────────

  @Get('support')
  async getTickets(@Query() q: PaginationDto) {
    return this.admin.getTickets(q.status ?? 'open', q.limit ?? 20, q.offset ?? 0)
  }

  @Get('support/:id')
  async getTicket(@Param('id') id: string) {
    return this.admin.getTicket(id)
  }

  @Post('support/:id/reply')
  @HttpCode(HttpStatus.NO_CONTENT)
  async replyToTicket(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: TicketReplyDto,
  ): Promise<void> {
    await this.admin.replyToTicket(req.user.id, id, dto.body)
  }

  @Patch('support/:id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateTicketStatus(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: TicketStatusDto,
  ): Promise<void> {
    await this.admin.updateTicketStatus(req.user.id, id, dto.status)
  }

  // ── System ─────────────────────────────────────────────────────────

  @Get('system')
  async getSystemStatus() {
    return this.admin.getSystemStatus()
  }

  @Post('system/maintenance')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setMaintenance(@Req() req: AdminRequest, @Body() dto: MaintenanceModeDto): Promise<void> {
    await this.admin.setMaintenanceMode(req.user.id, dto.enabled)
  }

  @Post('system/flush-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  async flushCache(@Req() req: AdminRequest, @Body() dto: FlushCacheDto): Promise<void> {
    await this.admin.flushCache(req.user.id, dto.pattern)
  }

  @Post('system/broadcast-push')
  @HttpCode(HttpStatus.NO_CONTENT)
  async broadcastPush(@Req() req: AdminRequest, @Body() dto: BroadcastPushDto): Promise<void> {
    await this.admin.broadcastPush(req.user.id, dto.title, dto.body, dto.url)
  }

  // ── Feature Flags ──────────────────────────────────────────────────

  @Patch('flags/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateFlag(
    @Req() req: AdminRequest,
    @Param('key') key: string,
    @Body() dto: UpdateFlagDto,
  ): Promise<void> {
    await this.admin.updateFlag(req.user.id, key, dto.enabled, dto.description)
  }

  // ── Audit Log ──────────────────────────────────────────────────────

  @Get('audit')
  async getAuditLog(@Query() q: PaginationDto) {
    return this.admin.getAuditLog({
      adminId: q.adminId,
      action: q.action,
      targetUserId: q.targetUserId,
      limit: q.limit ?? 50,
      offset: q.offset ?? 0,
    })
  }
}

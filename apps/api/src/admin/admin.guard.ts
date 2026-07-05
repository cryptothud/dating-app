import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context)
    const req = context.switchToHttp().getRequest<{ user?: { id: string; role: string } }>()
    if (req.user?.role !== 'admin') throw new ForbiddenException('Admin access required')
    return true
  }
}

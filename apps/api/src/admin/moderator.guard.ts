import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class ModeratorGuard extends AuthGuard('jwt') implements CanActivate {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context)
    const req = context.switchToHttp().getRequest<{ user?: { id: string; role: string } }>()
    const role = req.user?.role
    if (role !== 'admin' && role !== 'moderator') {
      throw new ForbiddenException('Moderator or admin access required')
    }
    return true
  }
}

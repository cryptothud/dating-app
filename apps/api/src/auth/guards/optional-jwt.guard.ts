import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Observable } from 'rxjs'

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context)
  }

  // Don't throw when unauthenticated — just set req.user to null
  override handleRequest<TUser>(_err: unknown, user: TUser): TUser | null {
    return user ?? null
  }
}

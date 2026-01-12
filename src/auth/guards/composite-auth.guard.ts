import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';
import { UserAuthGuard } from './user-auth.guard';

@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private readonly adminAuthGuard: AdminAuthGuard,
    private readonly userAuthGuard: UserAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (await this.adminAuthGuard.canActivate(context)) {
      return true;
    }
    if (await this.userAuthGuard.canActivate(context)) {
      return true;
    }

    return false;
  }
}

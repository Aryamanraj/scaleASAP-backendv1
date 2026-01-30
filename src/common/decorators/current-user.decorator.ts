import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  userId: number;
  email: string;
  clientId: number;
  role: string;
  supabaseUserId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Map User entity fields to CurrentUserData interface
    return {
      userId: user?.UserID,
      email: user?.Email,
      clientId: user?.ClientID,
      role: user?.Role,
      supabaseUserId: user?.SupabaseUserID || request.supabaseUserId,
    };
  },
);

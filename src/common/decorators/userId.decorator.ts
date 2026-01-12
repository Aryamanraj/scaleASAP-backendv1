import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request) {
      throw new Error('HTTP context is not available.');
    }

    const userId = request?.userId;
    if (!userId) {
      throw new Error('User ID is not available in the request.');
    }

    return userId;
  },
);

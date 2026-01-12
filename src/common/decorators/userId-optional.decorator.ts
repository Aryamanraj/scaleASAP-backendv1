import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OptionalUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request) {
      throw new Error('HTTP context is not available.');
    }
    const userId = request?.userId;
    return userId;
  },
);

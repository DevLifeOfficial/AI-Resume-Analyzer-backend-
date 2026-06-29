import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(
    req: Record<string, any>,
  ): Promise<string> {
    return req.ip;
  }

  protected getRequestResponse(context: ExecutionContext) {
    // HTTP Controller (OAuth)
    if (context.getType() === 'http') {
      const http = context.switchToHttp();

      return {
        req: http.getRequest(),
        res: http.getResponse(),
      };
    }

    // GraphQL Resolver
    const gqlContext = GqlExecutionContext.create(context);

    const ctx = gqlContext.getContext();

    return {
      req: ctx.req,
      res: ctx.res,
    };
  }
}
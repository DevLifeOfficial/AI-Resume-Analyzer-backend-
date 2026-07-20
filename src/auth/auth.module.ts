import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { Module } from '@nestjs/common';
import { AuthService } from "./auth.service";   
import { GoogleStrategy } from "./strategy/google.strategy";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { UserModule } from "src/user/user.module";
import { GqlThrottlerGuard } from "./guards/gql-throttler.guard";
import { AuthResolver } from "./auth.resolver";

@Module({
  imports: [
    UserModule,
    PassportModule,
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
    AuthResolver,
    GoogleStrategy,
    JwtStrategy,
    GqlThrottlerGuard
  ],
  exports: [
    AuthService,
    GqlThrottlerGuard
  ]
})
export class AuthModule {}
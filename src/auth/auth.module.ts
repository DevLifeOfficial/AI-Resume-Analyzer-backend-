import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { Module } from '@nestjs/common';
import { AuthService } from "./auth.service";   
import { GoogleStrategy } from "./strategy/google.strategy";
import { LinkedInStrategy } from "./strategy/linkedln.strategy";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "src/user/user.module";

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
        secret: process.env.JWT_SECRET || 'default_jwt_secret',
    })
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
    GoogleStrategy,
    LinkedInStrategy,
  ],
})
export class AuthModule {}
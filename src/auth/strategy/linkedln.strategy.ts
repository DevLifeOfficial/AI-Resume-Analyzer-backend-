// linkedin.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(
  Strategy,
  'linkedin',
) {
  constructor(
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>(
        'LINKEDIN_CLIENT_ID',
      )!,
      clientSecret: configService.get<string>(
        'LINKEDIN_CLIENT_SECRET',
      )!,
      callbackURL: configService.get<string>(
        'LINKEDIN_CALLBACK_URL',
      )!,

      scope: ['openid', 'profile', 'email'],

      state: true,
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    return {
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      linkedInId: profile.id,
      avatar: profile.photos?.[0]?.value,
    };
  }
}
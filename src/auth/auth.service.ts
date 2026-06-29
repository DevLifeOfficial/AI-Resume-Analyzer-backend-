import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserInput, LoginUserInput } from 'src/generated/models';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    return user;
  }

  async login(input: LoginUserInput, context: any) {
    const user = await this.validateUser(input.email, input.password);

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      isLogin: true,
      authType: user.authType,
    };

    const token = this.jwtService.sign(payload);

    context.res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user: { id: user._id,name:user.name, email: user.email, role: user.role } };
  }
  

  async register(input: CreateUserInput) {
    const response = await this.userService.register(input);
    return response;
  }

async googleLogin(user: {
  email: string;
  name: string;
  googleId: string;
  avatar?: string;
}) {
  let existingUser = await this.userService.findByEmail(
    user.email,
  );

  // Create account if first login
  if (!existingUser) {
    await this.userService.register({
      email: user.email,
      name: user.name,
      password: Math.random()
        .toString(36)
        .slice(-8),
      authType: 'GOOGLE',

      oauth: {
        googleId: user.googleId,
      },
    } as any);

    existingUser =
      await this.userService.findByEmail(
        user.email,
      );
  }

  if (!existingUser) {
    throw new UnauthorizedException(
      'Unable to create Google user',
    );
  }

  const payload = {
    sub: existingUser._id.toString(),
    email: existingUser.email,
    role: existingUser.role,
    authType: 'GOOGLE',
    isLogin: true,
  };

  const token = this.jwtService.sign(payload);

  return {
    token,
    user: {
      id: existingUser._id,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
      authType: existingUser.authType,
    },
  };
}

  async linkedInLogin(user: any) {
  let existingUser =
    await this.userService.findByEmail(
      user.email,
    );

  if (!existingUser) {
    await this.userService.register({
      email: user.email,
      name: user.name,
      authType: 'LINKEDIN',
      password: Math.random()
        .toString(36)
        .slice(-8),

      oAuth: {
        linkedInId: user.linkedInId,
      },
    });

    existingUser =
      await this.userService.findByEmail(
        user.email,
      );
  }

  const payload = {
    sub: existingUser!._id.toString(),
    email: existingUser!.email,
    role: existingUser!.role,
    authType: 'LINKEDIN',
  };

  return {
    token: this.jwtService.sign(payload),
    user: existingUser,
  };
}
}

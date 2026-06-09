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

    context.req.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user: { id: user._id, email: user.email, role: user.role } };
  }
  

  async register(input: CreateUserInput) {
    const response = await this.userService.register(input);
    return response;
  }

  async googleLogin(user: any, context: any) {
    let existingUser = await this.userService.findByEmail(user.email);
    let token: string = '';

    if (!existingUser) {
      const createUserInput: CreateUserInput = {
        email: user.email,
        name: user.name,
        authType: 'GOOGLE',
        oAuth: {
          googleId: user.googleId,
        },
        password: Math.random().toString(36).slice(-8), 
      };

      const registerResponse = await this.userService.register(createUserInput);
      existingUser = await this.userService.findByEmail(user.email);

      if (existingUser) {
        const payload = {
          sub: existingUser._id.toString(),
          email: existingUser.email,
          role: existingUser.role,
          isLogin: true,
          authType: existingUser.authType,
        };
        token = this.jwtService.sign(payload);
      }
    } else {
      const payload = {
        sub: existingUser._id.toString(),
        email: existingUser.email,
        role: existingUser.role,
        isLogin: true,
        authType: existingUser.authType,
      };
      token = this.jwtService.sign(payload);
    }

    return {
      token,
      existingUser
    };
  }
}

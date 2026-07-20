import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CreateUserInput, LoginUserInput } from '../generated/models';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation('register')
  register(@Args('input') input: CreateUserInput) {
    return this.authService.register(input);
  }

  @Mutation('login')
  async login(@Args('input') input: LoginUserInput, @Context() context: any) {
    return this.authService.login(input, context);
  }

  @Mutation('logout')
  @UseGuards(GqlAuthGuard)
  async logout(@Context() context: any) {
    await this.authService.logout(context);
    return true;
  }
}

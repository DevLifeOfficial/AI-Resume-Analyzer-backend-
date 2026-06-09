
import { AuthService } from 'src/auth/auth.service';
import { UserService } from './user.service';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { CreateUserInput, LoginUserInput, UpdateUserInput } from 'src/generated/models';
import { Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Resolver('User')
export class UserResolver {
  constructor(   
    private userService: UserService,
    private authService: AuthService
  ) {}

  @Query('getUsers')
  @UseGuards(GqlAuthGuard)
  getUsers() {
    return this.userService.findAll(); 
  }

  @Query('getCurrentUser')
   @UseGuards(GqlAuthGuard)
  getCurrentUser(@Context() context: any) {
    return this.userService.getCurrentUser(context.req.user.id);
  }

  @Query('getUserById')
   @UseGuards(GqlAuthGuard)
  getUserById(@Args('id') id: string) {
    return this.userService.findById(id);
  }

  @Mutation('register')
  register(@Args('input') input: CreateUserInput) {
    return this.authService.register(input); 
  }

  @Mutation('login')
  async login(@Args('input') input: LoginUserInput, @Context() context: any) {
    return this.authService.login(input,context);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth2 login flow
    

  }

  @Mutation('updateUser')
  @UseGuards(GqlAuthGuard)
  updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.userService.update(id, input);
  }

  @Mutation('deleteUser')
   @UseGuards(GqlAuthGuard)
  deleteUser(@Args('id') id: string) {
    return this.userService.deleteUser(id);
  }
}

import { AuthService } from 'src/auth/auth.service';
import { UserService } from './user.service';
import { GqlAuthGuard } from 'src/auth/guards/gql-auth.guard';
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { CreateUserInput, LoginUserInput, UpdateUserInput } from 'src/generated/models';
import { ForbiddenException, UseGuards } from '@nestjs/common';
import { UpdateProfileInput } from './dto/update-profile.input';


@Resolver('User')
export class UserResolver {
  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  @Query('getUsers')
  @UseGuards(GqlAuthGuard)
  getUsers() {
    return this.userService.findAll();
  }

  @Query('getCurrentUser')
  @UseGuards(GqlAuthGuard)
  getCurrentUser(@Context() context: any) {
    return this.userService.getCurrentUser(context.req.user.userId);
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
    return this.authService.login(input, context);
  }

  @Mutation('logout')
  @UseGuards(GqlAuthGuard)
  async logout(@Context() context: any) {
    await this.authService.logout(context);
    return true;
  }

  // FIX: previously any authenticated user could pass an arbitrary `id`
  // here and edit/delete someone else's account (IDOR). Now only the
  // account owner or an ADMIN can proceed.
  @Mutation('updateUser')
  @UseGuards(GqlAuthGuard)
  updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
    @Context() context: any,
  ) {
    const requester = context.req.user;
    if (requester.userId !== id && requester.role !== 'ADMIN') {
      throw new ForbiddenException('You can only update your own account');
    }
    return this.userService.update(id, input);
  }

  @Mutation('deleteUser')
  @UseGuards(GqlAuthGuard)
  deleteUser(@Args('id') id: string, @Context() context: any) {
    const requester = context.req.user;
    if (requester.userId !== id && requester.role !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.userService.deleteUser(id);
  }

  // Profile page: always acts on the authenticated user — no id argument,
  // so there's nothing for a client to spoof.
  @Mutation('updateProfile')
  @UseGuards(GqlAuthGuard)
  updateProfile(
    @Args('input') input: UpdateProfileInput,
    @Context() context: any,
  ) {
    const userId = context.req.user.userId;
    return this.userService.updateProfile(userId, input);
  }
}
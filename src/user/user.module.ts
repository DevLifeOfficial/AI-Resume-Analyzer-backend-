import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { User, UserSchema } from './user.schema';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
  ],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}


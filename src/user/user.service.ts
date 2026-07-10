import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import {
  CreateUserInput,
  LoginUserInput,
  UpdateUserInput,
} from 'src/generated/models';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateProfileInput } from './dto/update-profile.input';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: CreateUserInput): Promise<{
    user: Partial<UserDocument>;
  }> {
    const existingUser = await this.userModel.findOne({ email: input.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // Create user
    // FIX: this key was previously `settings` but the schema property was
    // named `setting` (typo) — Mongoose strict mode silently dropped it on
    // save. The schema field is now `settings` so this matches.
    const user = await this.userModel.create({
      ...input,
      password: hashedPassword,
      role: 'USER',
      plan: 'FREE',
      settings: {
        darkMode: false,
        notificationOnAnalysisComplete: true,
        emailNotifications: true,
        language: 'en',
      },
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async getCurrentUser(id: string): Promise<UserDocument | null> {
    return this.findById(id);
  }

  async update(
    id: string,
    updateUserInput: UpdateUserInput,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateUserInput, { new: true })
      .select('-password')
      .exec();
  }

  /**
   * Partial profile update: only the fields the client actually sent are
   * touched. Array sections (experience/education/projects/certificates)
   * are replaced wholesale when present — omit a section entirely to leave
   * it untouched.
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserDocument | null> {
    const updateFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        updateFields[key] = value;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return this.findById(userId);
    }

    return this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true },
      )
      .select('-password')
      .exec();
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id);
    return !!result;
  }
}
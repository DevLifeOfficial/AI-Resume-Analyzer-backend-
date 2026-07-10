import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ── Profile subdocuments ─────────────────────────────────────────────────

@Schema({ _id: true, timestamps: false })
export class Experience {
  @Prop({ required: true, trim: true, maxlength: 150 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 150 })
  company!: string;

  @Prop({ trim: true, maxlength: 150 })
  location?: string;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: false })
  isCurrent?: boolean;

  @Prop({ maxlength: 2000 })
  description?: string;

  @Prop({ type: [String], default: [] })
  skillsUsed?: string[];
}
export const ExperienceSchema = SchemaFactory.createForClass(Experience);

@Schema({ _id: true, timestamps: false })
export class Education {
  @Prop({ required: true, trim: true, maxlength: 150 })
  institution!: string;

  @Prop({ required: true, trim: true, maxlength: 150 })
  degree!: string;

  @Prop({ trim: true, maxlength: 150 })
  fieldOfStudy?: string;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ trim: true, maxlength: 50 })
  grade?: string;

  @Prop({ maxlength: 1000 })
  description?: string;
}
export const EducationSchema = SchemaFactory.createForClass(Education);

@Schema({ _id: true, timestamps: false })
export class Project {
  @Prop({ required: true, trim: true, maxlength: 150 })
  title!: string;

  @Prop({ maxlength: 2000 })
  description?: string;

  @Prop({ type: [String], default: [] })
  techStack?: string[];

  @Prop()
  projectUrl?: string;

  @Prop()
  repoUrl?: string;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;
}
export const ProjectSchema = SchemaFactory.createForClass(Project);

@Schema({ _id: true, timestamps: false })
export class Certificate {
  @Prop({ required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ trim: true, maxlength: 150 })
  issuingOrganization?: string;

  @Prop()
  issueDate?: Date;

  @Prop()
  expiryDate?: Date;

  @Prop({ trim: true, maxlength: 100 })
  credentialId?: string;

  @Prop()
  credentialUrl?: string;
}
export const CertificateSchema = SchemaFactory.createForClass(Certificate);

@Schema({ _id: false })
export class SocialLinks {
  @Prop()
  github?: string;

  @Prop()
  portfolio?: string;

  @Prop()
  twitter?: string;

  @Prop()
  website?: string;
}
export const SocialLinksSchema = SchemaFactory.createForClass(SocialLinks);

// ── User ──────────────────────────────────────────────────────────────────

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  authProvider?: string;

  @Prop()
  authProviderId?: string;

  @Prop({
    type: {
      googleId: String,
      linkedInId: String,
    },
  })
  oauth?: {
    googleId?: string;
    linkedInId?: string;
  };

  @Prop({ default: false })
  isLogin?: boolean;

  @Prop({ type: String, default: 'LOCAL', enum: ['LOCAL', 'GOOGLE', 'LINKEDIN'] })
  authType!: string;

  @Prop({
    type: String,
    enum: ['FREE', 'PRO', 'ENTERPRISE'],
    default: 'FREE',
  })
  plan!: string;

  @Prop({
    type: {
      customerId: String,
      subscriptionId: String,
      status: String,
      renewalDate: Date,
    },
  })
  subscription?: {
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    renewalDate?: Date;
  };

  @Prop({
    type: {
      totalScans: { type: Number, default: 0 },
      monthlyScans: { type: Number, default: 0 },
      dailyScans: { type: Number, default: 0 },
      lastScanDate: Date,
    },
  })
  usage?: {
    totalScans?: number;
    monthlyScans?: number;
    dailyScans?: number;
    lastScanDate?: Date;
  };

  @Prop({ default: 'USER' })
  role!: string;


  @Prop({
    type: {
      darkMode: { type: Boolean, default: false },
      notificationOnAnalysisComplete: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
    },
    default: {},
  })
  settings?: {
    darkMode?: boolean;
    notificationOnAnalysisComplete?: boolean;
    emailNotifications?: boolean;
    language?: string;
  };

  @Prop()
  linkedInUrl?: string;

  // ── Resume / profile data ────────────────────────────────────────────
  // All optional and filled in by the user post-login from their profile
  // page. Kept as a partial, progressively-completable profile rather
  // than required fields, since most users won't fill everything at once.

  @Prop({ trim: true, maxlength: 2000 })
  profileSummary?: string;

  @Prop({ type: [String], default: [], index: true })
  skills?: string[];

  @Prop({ type: [String], default: [] })
  interests?: string[];

  @Prop({ type: [ExperienceSchema], default: [] })
  experience?: Experience[];

  @Prop({ type: [EducationSchema], default: [] })
  education?: Education[];

  @Prop({ type: [ProjectSchema], default: [] })
  projects?: Project[];

  @Prop({ type: [CertificateSchema], default: [] })
  certificates?: Certificate[];

  @Prop({ type: SocialLinksSchema, default: {} })
  socialLinks?: SocialLinks;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
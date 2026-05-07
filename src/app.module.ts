import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import * as Joi from 'joi';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ResumeModule } from './resume/resume.module';
import { GraphQLScalarType } from 'graphql';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Inline Upload scalar — no external package needed
const GraphQLUpload = new GraphQLScalarType({
  name: 'Upload',
  description: 'File upload scalar',
  parseValue: (value) => value,
  parseLiteral: () => null,
  serialize: () => null,
});

const logger = new Logger('AppModule');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('7d'),
      }),
    }),

     ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        logger.log('Connecting to MongoDB...');
        return {
          uri: mongoUri,
          connectionFactory: (connection) => {
            connection.on('connected', () => logger.log('✅ MongoDB connected successfully'));
            connection.on('disconnected', () => logger.warn('⚠️  MongoDB disconnected'));
            connection.on('error', (err: Error) => logger.error('❌ MongoDB connection error:', err));
            return connection;
          },
        };
      },
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        logger.log('📊 GraphQL Module initialized');
        return {
          typePaths: ['./**/*.graphql'],
          playground: configService.get('NODE_ENV') !== 'production',
          introspection: configService.get('NODE_ENV') !== 'production',
          context: ({ req }) => ({ req }),
          resolvers: { Upload: GraphQLUpload },  // register inline scalar
          formatError: (error) => {
            logger.error('GraphQL Error:', error.message);
            return {
              message: error.message,
              extensions: {
                code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
              },
            };
          },
        };
      },
    }),

    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) throw new Error('JWT_SECRET is not defined');
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: 604800 },
        };
      },
    }),

    UserModule,
    ResumeModule,
  ],

  providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
],
})
export class AppModule {}
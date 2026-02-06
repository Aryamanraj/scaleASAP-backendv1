import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { UserAuthGuard } from './guards/user-auth.guard';
import { CompositeAuthGuard } from './guards/composite-auth.guard';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    RepoModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'default-secret-change-in-production',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AdminAuthGuard,
    UserAuthGuard,
    CompositeAuthGuard,
    SupabaseAuthGuard,
    AuthService,
  ],
  controllers: [AuthController],
  exports: [
    AdminAuthGuard,
    UserAuthGuard,
    CompositeAuthGuard,
    SupabaseAuthGuard,
    AuthService,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware);
  }
}

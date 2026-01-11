import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RepoModule, AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

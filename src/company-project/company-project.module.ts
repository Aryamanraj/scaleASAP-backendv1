import { MiddlewareConsumer, Module } from '@nestjs/common';
import { CompanyProjectController } from './company-project.controller';
import { CompanyProjectService } from './company-project.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { LoggerMiddleware } from '../common/middlewares/logger.middleware';

@Module({
  imports: [RepoModule, AuthModule],
  controllers: [CompanyProjectController],
  providers: [CompanyProjectService],
  exports: [CompanyProjectService],
})
export class CompanyProjectModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes(CompanyProjectController);
  }
}

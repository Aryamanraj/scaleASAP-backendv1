import { Module } from '@nestjs/common';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RepoModule, AuthModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}

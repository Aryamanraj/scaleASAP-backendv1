import { Module } from '@nestjs/common';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [RepoModule, AuthModule, WorkspaceModule],
  controllers: [ExperimentController],
  providers: [ExperimentService],
  exports: [ExperimentService],
})
export class ExperimentModule {}

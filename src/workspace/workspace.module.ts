import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceAccessGuard } from './guards/workspace-access.guard';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [RepoModule, AuthModule, AIModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceAccessGuard],
  exports: [WorkspaceService, WorkspaceAccessGuard],
})
export class WorkspaceModule {}

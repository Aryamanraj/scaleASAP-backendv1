import { Module } from '@nestjs/common';
import { LinkedinPostsNormalizerHandler } from './handlers/linkedin-posts-normalizer.handler';
import { LinkedinPostsNormalizerService } from './services/linkedin-posts-normalizer.service';
import { RepoModule } from '../../repo/repo.module';
import { DocumentsModule } from '../../documents/documents.module';

@Module({
  imports: [RepoModule, DocumentsModule],
  providers: [LinkedinPostsNormalizerHandler, LinkedinPostsNormalizerService],
  exports: [LinkedinPostsNormalizerHandler, LinkedinPostsNormalizerService],
})
export class LinkedinPostsNormalizerModule {}

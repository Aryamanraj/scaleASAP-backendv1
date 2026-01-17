import { Module } from '@nestjs/common';
import { RepoModule } from '../../repo/repo.module';
import { AIModule } from '../../ai/ai.module';
import { LinkedinPostsChunkEvidenceExtractorHandler } from './handlers/linkedin-posts-chunk-evidence-extractor.handler';
import { LinkedinPostsChunkEvidenceExtractorService } from './services/linkedin-posts-chunk-evidence-extractor.service';

@Module({
  imports: [RepoModule, AIModule],
  providers: [
    LinkedinPostsChunkEvidenceExtractorHandler,
    LinkedinPostsChunkEvidenceExtractorService,
  ],
  exports: [LinkedinPostsChunkEvidenceExtractorHandler],
})
export class LinkedinPostsChunkEvidenceExtractorModule {}

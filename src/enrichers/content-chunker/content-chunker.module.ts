import { Module } from '@nestjs/common';
import { RepoModule } from '../../repo/repo.module';
import { ContentChunkerHandler } from './handlers/content-chunker.handler';
import { ContentChunkerService } from './services/content-chunker.service';

@Module({
  imports: [RepoModule],
  providers: [ContentChunkerHandler, ContentChunkerService],
  exports: [ContentChunkerHandler],
})
export class ContentChunkerModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RepoModule } from '../../repo/repo.module';
import { LinkedinDocumentWriterService } from '../../observer/services/linkedin-document-writer.service';
import { LinkedinProfileConnectorHandler } from './handlers/linkedin-profile-connector.handler';
import { LinkedinPostsConnectorHandler } from './handlers/linkedin-posts-connector.handler';
import { LinkedinProvider } from '../../scraper/providers/linkedin.provider';

@Module({
  imports: [ConfigModule, HttpModule, RepoModule],
  providers: [
    LinkedinDocumentWriterService,
    LinkedinProvider,
    LinkedinProfileConnectorHandler,
    LinkedinPostsConnectorHandler,
  ],
  exports: [LinkedinProfileConnectorHandler, LinkedinPostsConnectorHandler],
})
export class LinkedinConnectorModule {}

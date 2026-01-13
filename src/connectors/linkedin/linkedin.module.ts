import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RepoModule } from '../../repo/repo.module';
import { ApifyService } from '../../observer/services/apify.service';
import { LinkedinDocumentWriterService } from '../../observer/services/linkedin-document-writer.service';
import { LinkedinProfileConnectorHandler } from './handlers/linkedin-profile-connector.handler';
import { LinkedinPostsConnectorHandler } from './handlers/linkedin-posts-connector.handler';

@Module({
  imports: [HttpModule, RepoModule],
  providers: [
    ApifyService,
    LinkedinDocumentWriterService,
    LinkedinProfileConnectorHandler,
    LinkedinPostsConnectorHandler,
  ],
  exports: [LinkedinProfileConnectorHandler, LinkedinPostsConnectorHandler],
})
export class LinkedinConnectorModule {}

import { Module } from '@nestjs/common';
import { RepoModule } from '../../repo/repo.module';
import { DocumentsModule } from '../../documents/documents.module';
import { AIModule } from '../../ai/ai.module';
import { LinkedinCoreIdentityEnricherHandler } from './handlers/linkedin-core-identity-enricher.handler';
import { LinkedinCoreIdentityEnricherService } from './services/linkedin-core-identity-enricher.service';

@Module({
  imports: [RepoModule, DocumentsModule, AIModule],
  providers: [
    LinkedinCoreIdentityEnricherHandler,
    LinkedinCoreIdentityEnricherService,
  ],
  exports: [LinkedinCoreIdentityEnricherHandler],
})
export class LinkedinCoreIdentityModule {}

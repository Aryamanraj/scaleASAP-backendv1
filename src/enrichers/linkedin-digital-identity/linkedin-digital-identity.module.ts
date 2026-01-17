/**
 * LinkedIn Digital Identity Enricher Module
 */

import { Module } from '@nestjs/common';
import { RepoModule } from '../../repo/repo.module';
import { DocumentsModule } from '../../documents/documents.module';
import { AIModule } from '../../ai/ai.module';
import { LinkedinDigitalIdentityEnricherHandler } from './handlers/linkedin-digital-identity-enricher.handler';
import { LinkedinDigitalIdentityEnricherService } from './services/linkedin-digital-identity-enricher.service';

@Module({
  imports: [RepoModule, DocumentsModule, AIModule],
  providers: [
    LinkedinDigitalIdentityEnricherHandler,
    LinkedinDigitalIdentityEnricherService,
  ],
  exports: [LinkedinDigitalIdentityEnricherHandler],
})
export class LinkedinDigitalIdentityModule {}

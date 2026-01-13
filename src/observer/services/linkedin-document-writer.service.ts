import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DocumentRepoService } from '../../repo/document-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { ResultWithError } from '../../common/interfaces';
import { Document } from '../../repo/entities/document.entity';
import { DocumentSource } from '../../common/types/claim-types';
import { sha256Hex } from '../../common/helpers/sha256';
import { WriteLinkedinDocumentParams } from '../../common/interfaces/linkedin.interfaces';

@Injectable()
export class LinkedinDocumentWriterService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentRepoService: DocumentRepoService,
  ) {}

  async writeLinkedinDocument(
    params: WriteLinkedinDocumentParams,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinDocumentWriterService.writeLinkedinDocument: Writing document [ProjectID=${params.projectId}, PersonID=${params.personId}, Type=${params.documentType}]`,
      );

      // Generate content hash
      const contentString = JSON.stringify(params.payloadJson);
      const hash = sha256Hex(contentString);

      // Create document
      const document = await Promisify<Document>(
        this.documentRepoService.create({
          ProjectID: params.projectId,
          PersonID: params.personId,
          Source: DocumentSource.LINKEDIN,
          SourceRef: params.sourceRef,
          ContentType: params.documentType,
          StorageUri: params.storageUri,
          Hash: hash,
          CapturedAt: new Date(),
          ModuleRunID: params.moduleRunId,
          PayloadJson: params.payloadJson,
        }),
      );

      this.logger.info(
        `LinkedinDocumentWriterService.writeLinkedinDocument: Document created [DocumentID=${document.DocumentID}, Hash=${hash}]`,
      );

      return { error: null, data: document };
    } catch (error) {
      this.logger.error(
        `LinkedinDocumentWriterService.writeLinkedinDocument: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }
}

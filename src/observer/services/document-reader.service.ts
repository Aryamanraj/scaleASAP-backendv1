import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DocumentRepoService } from '../../repo/document-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { Document } from '../../repo/entities/document.entity';
import { ResultWithError } from '../../common/interfaces';

@Injectable()
export class DocumentReaderService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentRepoService: DocumentRepoService,
  ) {}

  async getLatestBySource(
    projectId: number,
    personId: number,
    source: string,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `DocumentReaderService.getLatestBySource: Finding latest document`,
        {
          projectId,
          personId,
          source,
        },
      );

      const documents = await Promisify<Document[]>(
        this.documentRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              Source: source,
            },
            order: {
              CapturedAt: 'DESC',
              CreatedAt: 'DESC',
            },
            take: 1,
          },
          true,
        ),
      );

      const document = documents[0];

      this.logger.info(
        `DocumentReaderService.getLatestBySource: Found document`,
        {
          documentId: document.DocumentID,
        },
      );

      return { error: null, data: document };
    } catch (error) {
      this.logger.error(
        `DocumentReaderService.getLatestBySource: Error - ${error.message}`,
        {
          projectId,
          personId,
          source,
        },
      );
      return { error: error, data: null };
    }
  }
}

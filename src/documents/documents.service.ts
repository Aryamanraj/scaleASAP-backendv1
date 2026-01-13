import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DocumentRepoService } from '../repo/document-repo.service';
import { Promisify } from '../common/helpers/promisifier';
import { ResultWithError } from '../common/interfaces';
import { Document } from '../repo/entities/document.entity';
import { ListDocumentsQueryDto } from './dto/list-documents.dto';
import { InvalidateDocumentDto } from './dto/invalidate-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';
import { DocumentSource, DocumentKind } from '../common/types/document.types';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentRepoService: DocumentRepoService,
  ) {}

  /**
   * Get the latest valid document for a specific person/project/source/kind
   */
  async getLatestValidDocument(params: {
    projectId: number;
    personId: number;
    source: DocumentSource | string;
    documentKind: DocumentKind | string;
  }): Promise<ResultWithError> {
    try {
      this.logger.info(
        `DocumentsService.getLatestValidDocument called [projectId=${params.projectId}, personId=${params.personId}, source=${params.source}, documentKind=${params.documentKind}]`,
      );

      const documents = await Promisify<Document[]>(
        this.documentRepoService.getAll(
          {
            where: {
              ProjectID: params.projectId,
              PersonID: params.personId,
              Source: params.source,
              DocumentKind: params.documentKind,
              IsValid: true,
            },
            order: {
              CapturedAt: 'DESC',
              CreatedAt: 'DESC',
            },
            take: 1,
          },
          true, // panic if not found
        ),
      );

      const document = documents[0];

      this.logger.info(
        `DocumentsService.getLatestValidDocument success [documentId=${document.DocumentID}, capturedAt=${document.CapturedAt}]`,
      );

      return { error: null, data: document };
    } catch (error) {
      this.logger.error(
        `DocumentsService.getLatestValidDocument error [error=${error.message}, projectId=${params.projectId}, personId=${params.personId}, source=${params.source}, documentKind=${params.documentKind}]`,
      );
      return { error: error, data: null };
    }
  }

  async listDocuments(
    filters: ListDocumentsQueryDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `DocumentsService.listDocuments called [filters=${JSON.stringify(
          filters,
        )}]`,
      );

      const whereConditions: any = {
        ProjectID: filters.projectId,
        PersonID: filters.personId,
      };

      if (filters.source) {
        whereConditions.Source = filters.source;
      }

      if (filters.documentKind) {
        whereConditions.DocumentKind = filters.documentKind;
      }

      if (filters.isValid !== undefined) {
        whereConditions.IsValid = filters.isValid;
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const documents = await Promisify<Document[]>(
        this.documentRepoService.getAll({
          where: whereConditions,
          order: {
            CapturedAt: 'DESC',
            CreatedAt: 'DESC',
          },
          take: limit,
          skip: offset,
        }),
      );

      this.logger.info(
        `DocumentsService.listDocuments success [count=${documents.length}]`,
      );

      return { error: null, data: documents };
    } catch (error) {
      this.logger.error(
        `DocumentsService.listDocuments error [error=${error.message}]`,
      );
      return { error: error, data: null };
    }
  }

  async invalidateDocument(
    dto: InvalidateDocumentDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `DocumentsService.invalidateDocument called [documentId=${dto.documentId}, invalidatedByUserId=${dto.invalidatedByUserId}]`,
      );

      // Update document
      await Promisify(
        this.documentRepoService.update(
          { DocumentID: dto.documentId },
          {
            IsValid: false,
            InvalidatedMetaJson: {
              reason: dto.reason,
              invalidatedByUserId: dto.invalidatedByUserId,
              invalidatedAt: new Date().toISOString(),
            } as any,
          },
        ),
      );

      // Fetch updated document
      const document = await Promisify<Document>(
        this.documentRepoService.get(
          { where: { DocumentID: dto.documentId } },
          true,
        ),
      );

      this.logger.info(
        `DocumentsService.invalidateDocument success [documentId=${dto.documentId}]`,
      );

      return { error: null, data: document };
    } catch (error) {
      this.logger.error(
        `DocumentsService.invalidateDocument error [error=${error.message}, documentId=${dto.documentId}]`,
      );
      return { error: error, data: null };
    }
  }

  async validateDocument(dto: ValidateDocumentDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `DocumentsService.validateDocument called [documentId=${dto.documentId}, validatedByUserId=${dto.validatedByUserId}]`,
      );

      // Update document
      await Promisify(
        this.documentRepoService.update(
          { DocumentID: dto.documentId },
          {
            IsValid: true,
            InvalidatedMetaJson: {
              revalidatedByUserId: dto.validatedByUserId,
              revalidatedAt: new Date().toISOString(),
              reason: dto.reason,
            } as any,
          },
        ),
      );

      // Fetch updated document
      const document = await Promisify<Document>(
        this.documentRepoService.get(
          { where: { DocumentID: dto.documentId } },
          true,
        ),
      );

      this.logger.info(
        `DocumentsService.validateDocument success [documentId=${dto.documentId}]`,
      );

      return { error: null, data: document };
    } catch (error) {
      this.logger.error(
        `DocumentsService.validateDocument error [error=${error.message}, documentId=${dto.documentId}]`,
      );
      return { error: error, data: null };
    }
  }
}

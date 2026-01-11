import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { IsNull } from 'typeorm';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { ResultWithError } from '../common/interfaces/index';
import { ProjectRepoService } from '../repo/project-repo.service';
import { PersonRepoService } from '../repo/person-repo.service';
import { PersonProjectRepoService } from '../repo/person-project-repo.service';
import { LayerSnapshotRepoService } from '../repo/layer-snapshot-repo.service';
import { ClaimRepoService } from '../repo/claim-repo.service';
import { DocumentRepoService } from '../repo/document-repo.service';
import { Project } from '../repo/entities/project.entity';
import { Person } from '../repo/entities/person.entity';
import { PersonProject } from '../repo/entities/person-project.entity';
import { LayerSnapshot } from '../repo/entities/layer-snapshot.entity';
import { Claim } from '../repo/entities/claim.entity';
import { Document } from '../repo/entities/document.entity';
import { ListClaimsQueryDto } from './dto/list-claims-query.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { LayerInfoDto } from './dto/layer-info.dto';

@Injectable()
export class InsightsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private projectRepoService: ProjectRepoService,
    private personRepoService: PersonRepoService,
    private personProjectRepoService: PersonProjectRepoService,
    private layerSnapshotRepoService: LayerSnapshotRepoService,
    private claimRepoService: ClaimRepoService,
    private documentRepoService: DocumentRepoService,
  ) {}

  private async validateProjectPersonAttachment(
    projectId: number,
    personId: number,
  ): Promise<void> {
    this.logger.info(
      `InsightsService.validateProjectPersonAttachment: Validating ProjectID=${projectId}, PersonID=${personId}`,
    );

    // Validate project exists
    await Promisify<Project>(
      this.projectRepoService.get({ where: { ProjectID: projectId } }, true),
    );

    // Validate person exists
    await Promisify<Person>(
      this.personRepoService.get({ where: { PersonID: personId } }, true),
    );

    // Validate person is attached to project
    const attachments = await Promisify<PersonProject[]>(
      this.personProjectRepoService.getAll(
        { where: { ProjectID: projectId, PersonID: personId } },
        false,
      ),
    );

    if (attachments.length === 0) {
      this.logger.error(
        `InsightsService.validateProjectPersonAttachment: Person not attached to project [ProjectID=${projectId}, PersonID=${personId}]`,
      );
      throw new GenericError(
        'Person is not attached to this project',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.info(
      `InsightsService.validateProjectPersonAttachment: Validation successful`,
    );
  }

  async getLayerSnapshot(
    projectId: number,
    personId: number,
    layerNumber: number,
    version?: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `InsightsService.getLayerSnapshot: Fetching layer snapshot [ProjectID=${projectId}, PersonID=${personId}, LayerNumber=${layerNumber}, Version=${version}]`,
      );

      await this.validateProjectPersonAttachment(projectId, personId);

      let snapshot: LayerSnapshot;

      if (version !== undefined) {
        // Get specific version
        snapshot = await Promisify<LayerSnapshot>(
          this.layerSnapshotRepoService.get(
            {
              where: {
                ProjectID: projectId,
                PersonID: personId,
                LayerNumber: layerNumber,
                SnapshotVersion: version,
              },
            },
            true,
          ),
        );
      } else {
        // Get latest version
        const snapshots = await Promisify<LayerSnapshot[]>(
          this.layerSnapshotRepoService.getAll(
            {
              where: {
                ProjectID: projectId,
                PersonID: personId,
                LayerNumber: layerNumber,
              },
              order: { SnapshotVersion: 'DESC' },
              take: 1,
            },
            false,
          ),
        );

        if (snapshots.length === 0) {
          throw new GenericError(
            `No snapshots found for layer ${layerNumber}`,
            HttpStatus.NOT_FOUND,
          );
        }

        snapshot = snapshots[0];
      }

      this.logger.info(
        `InsightsService.getLayerSnapshot: Found snapshot [LayerSnapshotID=${snapshot.LayerSnapshotID}, Version=${snapshot.SnapshotVersion}]`,
      );

      return { error: null, data: snapshot };
    } catch (error) {
      this.logger.error(
        `InsightsService.getLayerSnapshot: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  async listLayers(
    projectId: number,
    personId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `InsightsService.listLayers: Listing layers [ProjectID=${projectId}, PersonID=${personId}]`,
      );

      await this.validateProjectPersonAttachment(projectId, personId);

      // Fetch all snapshots for this person+project
      const snapshots = await Promisify<LayerSnapshot[]>(
        this.layerSnapshotRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
            },
            order: { LayerNumber: 'ASC', SnapshotVersion: 'DESC' },
          },
          false,
        ),
      );

      // Group by LayerNumber and pick highest SnapshotVersion
      const layerMap = new Map<number, LayerSnapshot>();
      for (const snapshot of snapshots) {
        if (!layerMap.has(snapshot.LayerNumber)) {
          layerMap.set(snapshot.LayerNumber, snapshot);
        }
      }

      const layerInfos: LayerInfoDto[] = Array.from(layerMap.values()).map(
        (snapshot) => ({
          layerNumber: snapshot.LayerNumber,
          latestSnapshotVersion: snapshot.SnapshotVersion,
          generatedAt: snapshot.GeneratedAt.toISOString(),
          layerSnapshotId: snapshot.LayerSnapshotID,
        }),
      );

      this.logger.info(
        `InsightsService.listLayers: Found ${layerInfos.length} layers`,
      );

      return { error: null, data: layerInfos };
    } catch (error) {
      this.logger.error(`InsightsService.listLayers: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  async listClaims(
    projectId: number,
    personId: number,
    query: ListClaimsQueryDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `InsightsService.listClaims: Listing claims [ProjectID=${projectId}, PersonID=${personId}, Query=${JSON.stringify(
          query,
        )}]`,
      );

      await this.validateProjectPersonAttachment(projectId, personId);

      // Build where clause
      const where: any = {
        ProjectID: projectId,
        PersonID: personId,
      };

      if (query.claimType) {
        where.ClaimType = query.claimType;
      }

      if (query.activeOnly !== false) {
        where.SupersededAt = IsNull();
      }

      // Fetch claims with pagination
      const claims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where,
            order: { CreatedAt: 'DESC' },
            take: query.limit || 50,
            skip: query.offset || 0,
          },
          false,
        ),
      );

      // Get total count
      const total = await Promisify<number>(
        this.claimRepoService.count({ where }),
      );

      this.logger.info(
        `InsightsService.listClaims: Found ${claims.length} claims, total=${total}`,
      );

      return {
        error: null,
        data: {
          items: claims,
          total,
          limit: query.limit || 50,
          offset: query.offset || 0,
        },
      };
    } catch (error) {
      this.logger.error(`InsightsService.listClaims: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  async listDocuments(
    projectId: number,
    personId: number,
    query: ListDocumentsQueryDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `InsightsService.listDocuments: Listing documents [ProjectID=${projectId}, PersonID=${personId}, Query=${JSON.stringify(
          query,
        )}]`,
      );

      await this.validateProjectPersonAttachment(projectId, personId);

      // Build where clause
      const where: any = {
        ProjectID: projectId,
        PersonID: personId,
      };

      if (query.source) {
        where.Source = query.source;
      }

      // Fetch documents with pagination
      const documents = await Promisify<Document[]>(
        this.documentRepoService.getAll(
          {
            where,
            order: { CapturedAt: 'DESC' },
            take: query.limit || 50,
            skip: query.offset || 0,
          },
          false,
        ),
      );

      // Get total count
      const total = await Promisify<number>(
        this.documentRepoService.count({ where }),
      );

      this.logger.info(
        `InsightsService.listDocuments: Found ${documents.length} documents, total=${total}`,
      );

      return {
        error: null,
        data: {
          items: documents,
          total,
          limit: query.limit || 50,
          offset: query.offset || 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `InsightsService.listDocuments: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }
}

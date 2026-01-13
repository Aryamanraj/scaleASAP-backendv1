import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { LayerSnapshotRepoService } from '../../repo/layer-snapshot-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { LayerSnapshot } from '../../repo/entities/layer-snapshot.entity';
import { ResultWithError, CreateSnapshotParams } from '../../common/interfaces';

@Injectable()
export class LayerSnapshotWriterService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private layerSnapshotRepoService: LayerSnapshotRepoService,
  ) {}

  async createNextSnapshotVersion(
    params: CreateSnapshotParams,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LayerSnapshotWriterService.createNextSnapshotVersion: Creating next snapshot`,
        {
          projectId: params.ProjectID,
          personId: params.PersonID,
          layerNumber: params.LayerNumber,
        },
      );

      // Find latest snapshot version
      const snapshots = await Promisify<LayerSnapshot[]>(
        this.layerSnapshotRepoService.getAll(
          {
            where: {
              ProjectID: params.ProjectID,
              PersonID: params.PersonID,
              LayerNumber: params.LayerNumber,
            },
            order: {
              SnapshotVersion: 'DESC',
            },
            take: 1,
          },
          false,
        ),
      );

      const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
      const newVersion = latestSnapshot
        ? latestSnapshot.SnapshotVersion + 1
        : 1;

      this.logger.info(
        `LayerSnapshotWriterService.createNextSnapshotVersion: Calculated version`,
        {
          previousVersion: latestSnapshot?.SnapshotVersion || 0,
          newVersion,
        },
      );

      // Create new snapshot
      const newSnapshot = await Promisify<LayerSnapshot>(
        this.layerSnapshotRepoService.create({
          ProjectID: params.ProjectID,
          PersonID: params.PersonID,
          LayerNumber: params.LayerNumber,
          SnapshotVersion: newVersion,
          ComposerModuleKey: params.ComposerModuleKey,
          ComposerVersion: params.ComposerVersion,
          CompiledJson: params.CompiledJson,
          GeneratedAt: params.GeneratedAt,
          ModuleRunID: params.ModuleRunID,
        }),
      );

      this.logger.info(
        `LayerSnapshotWriterService.createNextSnapshotVersion: Snapshot created`,
        {
          layerSnapshotId: newSnapshot.LayerSnapshotID,
          snapshotVersion: newSnapshot.SnapshotVersion,
        },
      );

      return { error: null, data: newSnapshot };
    } catch (error) {
      this.logger.error(
        `LayerSnapshotWriterService.createNextSnapshotVersion: Error - ${error.message}`,
        {
          params,
        },
      );
      return { error: error, data: null };
    }
  }
}

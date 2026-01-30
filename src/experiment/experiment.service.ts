import { Inject, Injectable, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { GenericError } from '../common/errors/Generic.error';
import { ExperimentRepoService } from '../repo/experiment-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { Experiment } from '../repo/entities/experiment.entity';
import { Project } from '../repo/entities/project.entity';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { CreateExperimentsBatchDto } from './dto/create-experiments-batch.dto';
import { UpdateExperimentDto } from './dto/update-experiment.dto';
import { ExperimentStatus } from '../common/constants/entity.constants';

@Injectable()
export class ExperimentService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private experimentRepoService: ExperimentRepoService,
    private projectRepoService: ProjectRepoService,
  ) {}

  /**
   * Get all experiments for a workspace.
   */
  async getExperimentsForWorkspace(
    workspaceId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ExperimentService.getExperimentsForWorkspace: Getting experiments [workspaceId=${workspaceId}]`,
      );

      const experiments = await Promisify<Experiment[]>(
        this.experimentRepoService.getAll(
          {
            where: { ProjectID: workspaceId },
            order: { CreatedAt: 'DESC' },
          },
          false,
        ),
      );

      this.logger.info(
        `ExperimentService.getExperimentsForWorkspace: Found ${experiments.length} experiments [workspaceId=${workspaceId}]`,
      );

      return { data: experiments, error: null };
    } catch (error) {
      this.logger.error(
        `ExperimentService.getExperimentsForWorkspace: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get a single experiment by ID.
   */
  async getExperimentById(experimentId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ExperimentService.getExperimentById: Getting experiment [experimentId=${experimentId}]`,
      );

      const experiment = await Promisify<Experiment>(
        this.experimentRepoService.get(
          {
            where: { ExperimentID: experimentId },
            relations: { Project: true },
          },
          true,
        ),
      );

      return { data: experiment, error: null };
    } catch (error) {
      this.logger.error(
        `ExperimentService.getExperimentById: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Create a single experiment.
   */
  async createExperiment(
    workspaceId: number,
    dto: CreateExperimentDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ExperimentService.createExperiment: Creating experiment [workspaceId=${workspaceId}, name=${dto.name}]`,
      );

      // Verify workspace exists
      await Promisify<Project>(
        this.projectRepoService.get(
          { where: { ProjectID: workspaceId } },
          true,
        ),
      );

      const experiment = await Promisify<Experiment>(
        this.experimentRepoService.create({
          ProjectID: workspaceId,
          Type: dto.type,
          Name: dto.name,
          Pattern: dto.pattern,
          Industries: dto.industries,
          WizaFilters: dto.wizaFilters,
          Status: ExperimentStatus.PENDING,
        }),
      );

      this.logger.info(
        `ExperimentService.createExperiment: Successfully created experiment [experimentId=${experiment.ExperimentID}]`,
      );

      return { data: experiment, error: null };
    } catch (error) {
      this.logger.error(
        `ExperimentService.createExperiment: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Create multiple experiments in batch.
   */
  async createExperimentsBatch(
    dto: CreateExperimentsBatchDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ExperimentService.createExperimentsBatch: Creating ${dto.experiments.length} experiments [workspaceId=${dto.workspaceId}]`,
      );

      // Verify workspace exists
      await Promisify<Project>(
        this.projectRepoService.get(
          { where: { ProjectID: dto.workspaceId } },
          true,
        ),
      );

      const experiments: Experiment[] = [];
      for (const expDto of dto.experiments) {
        const experiment = await Promisify<Experiment>(
          this.experimentRepoService.create({
            ProjectID: dto.workspaceId,
            Type: expDto.type,
            Name: expDto.name,
            Pattern: expDto.pattern,
            Industries: expDto.industries,
            WizaFilters: expDto.wizaFilters,
            Status: ExperimentStatus.PENDING,
          }),
        );
        experiments.push(experiment);
      }

      this.logger.info(
        `ExperimentService.createExperimentsBatch: Successfully created ${experiments.length} experiments`,
      );

      return { data: experiments, error: null };
    } catch (error) {
      this.logger.error(
        `ExperimentService.createExperimentsBatch: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Update an experiment.
   */
  async updateExperiment(
    experimentId: number,
    dto: UpdateExperimentDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ExperimentService.updateExperiment: Updating experiment [experimentId=${experimentId}]`,
      );

      // Build update data
      const updateData: Partial<Experiment> = {};
      if (dto.name !== undefined) updateData.Name = dto.name;
      if (dto.pattern !== undefined) updateData.Pattern = dto.pattern;
      if (dto.industries !== undefined) updateData.Industries = dto.industries;
      if (dto.wizaFilters !== undefined)
        updateData.WizaFilters = dto.wizaFilters;
      if (dto.status !== undefined) updateData.Status = dto.status;

      await Promisify(
        this.experimentRepoService.update(
          { ExperimentID: experimentId },
          updateData,
        ),
      );

      // Fetch updated experiment
      const experiment = await Promisify<Experiment>(
        this.experimentRepoService.get(
          { where: { ExperimentID: experimentId } },
          true,
        ),
      );

      this.logger.info(
        `ExperimentService.updateExperiment: Successfully updated experiment [experimentId=${experimentId}]`,
      );

      return { data: experiment, error: null };
    } catch (error) {
      this.logger.error(
        `ExperimentService.updateExperiment: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Delete an experiment (soft delete by setting status).
   */
  async deleteExperiment(experimentId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ExperimentService.deleteExperiment: Deleting experiment [experimentId=${experimentId}]`,
      );

      await Promisify(
        this.experimentRepoService.update(
          { ExperimentID: experimentId },
          { Status: ExperimentStatus.COMPLETE },
        ),
      );

      this.logger.info(
        `ExperimentService.deleteExperiment: Successfully deleted experiment [experimentId=${experimentId}]`,
      );

      return { data: { success: true }, error: null };
    } catch (error) {
      this.logger.error(
        `ExperimentService.deleteExperiment: Error - ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  /**
   * Get workspace ID for an experiment (for access checking).
   */
  async getWorkspaceIdForExperiment(
    experimentId: number,
  ): Promise<number | null> {
    try {
      const experiment = await Promisify<Experiment>(
        this.experimentRepoService.get(
          { where: { ExperimentID: experimentId } },
          false,
        ),
      );
      return experiment?.ProjectID || null;
    } catch {
      return null;
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { QueueNames, QUEUE_JOB_NAMES } from '../common/constants';
import { ModuleRepoService } from '../repo/module-repo.service';
import { ModuleRunRepoService } from '../repo/module-run-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { PersonRepoService } from '../repo/person-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import { Promisify } from '../common/helpers/promisifier';
import { RegisterModuleDto } from './dto/register-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { CreateModuleRunDto } from './dto/create-module-run.dto';
import { ListModuleRunsQueryDto } from './dto/list-module-runs-query.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import { Module } from '../repo/entities/module.entity';
import { ModuleRun } from '../repo/entities/module-run.entity';
import { ModuleRunStatus } from '../common/constants/entity.constants';

@Injectable()
export class ModuleRunnerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.MODULE_RUNS) private moduleRunsQueue: Queue,
    private moduleRepoService: ModuleRepoService,
    private moduleRunRepoService: ModuleRunRepoService,
    private projectRepoService: ProjectRepoService,
    private personRepoService: PersonRepoService,
    private userRepoService: UserRepoService,
  ) {}

  async registerModule(dto: RegisterModuleDto): Promise<ResultWithError> {
    try {
      this.logger.info('ModuleRunnerService.registerModule called', { dto });

      const moduleData = {
        ModuleKey: dto.moduleKey,
        ModuleType: dto.moduleType,
        Version: dto.version,
        ConfigSchemaJson: dto.configSchemaJson,
        IsEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
      };

      const module = await Promisify<Module>(
        this.moduleRepoService.create(moduleData),
      );

      this.logger.info('ModuleRunnerService.registerModule success', {
        moduleId: module.ModuleID,
      });
      return { error: null, data: module };
    } catch (error) {
      this.logger.error('ModuleRunnerService.registerModule error', {
        error: error.message,
        dto,
      });
      return { error: error, data: null };
    }
  }

  async listModules(filters: ListModulesQueryDto): Promise<ResultWithError> {
    try {
      this.logger.info('ModuleRunnerService.listModules called', { filters });

      const whereConditions: any = {};

      if (filters.moduleKey) {
        whereConditions.ModuleKey = filters.moduleKey;
      }

      if (filters.moduleType) {
        whereConditions.ModuleType = filters.moduleType;
      }

      if (filters.isEnabled !== undefined) {
        whereConditions.IsEnabled = filters.isEnabled;
      }

      const modules = await Promisify<Module[]>(
        this.moduleRepoService.getAll({ where: whereConditions }),
      );

      this.logger.info('ModuleRunnerService.listModules success', {
        count: modules.length,
      });
      return { error: null, data: modules };
    } catch (error) {
      this.logger.error('ModuleRunnerService.listModules error', {
        error: error.message,
      });
      return { error: error, data: null };
    }
  }

  async updateModule(
    moduleId: number,
    dto: UpdateModuleDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('ModuleRunnerService.updateModule called', {
        moduleId,
        dto,
      });

      const updateData: any = {};

      if (dto.isEnabled !== undefined) {
        updateData.IsEnabled = dto.isEnabled;
      }

      if (dto.configSchemaJson !== undefined) {
        updateData.ConfigSchemaJson = dto.configSchemaJson;
      }

      await Promisify(
        this.moduleRepoService.update({ ModuleID: moduleId }, updateData),
      );

      // Fetch updated module
      const module = await Promisify<Module>(
        this.moduleRepoService.get({ where: { ModuleID: moduleId } }, true),
      );

      this.logger.info('ModuleRunnerService.updateModule success', {
        moduleId,
      });
      return { error: null, data: module };
    } catch (error) {
      this.logger.error('ModuleRunnerService.updateModule error', {
        error: error.message,
        moduleId,
      });
      return { error: error, data: null };
    }
  }

  async createModuleRun(
    projectId: number,
    personId: number,
    dto: CreateModuleRunDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('ModuleRunnerService.createModuleRun called', {
        projectId,
        personId,
        dto,
      });

      // Validate project exists
      await Promisify(
        this.projectRepoService.get({ where: { ProjectID: projectId } }, true),
      );

      // Validate person exists
      await Promisify(
        this.personRepoService.get({ where: { PersonID: personId } }, true),
      );

      // Validate triggered by user exists
      await Promisify(
        this.userRepoService.get(
          { where: { UserID: dto.triggeredByUserId } },
          true,
        ),
      );

      // Find module - if version not specified, get latest enabled version
      let module: Module;
      if (dto.moduleVersion) {
        module = await Promisify<Module>(
          this.moduleRepoService.get(
            {
              where: {
                ModuleKey: dto.moduleKey,
                Version: dto.moduleVersion,
                IsEnabled: true,
              },
            },
            true,
          ),
        );
      } else {
        // Find latest enabled version for this module key
        const modules = await Promisify<Module[]>(
          this.moduleRepoService.getAll({
            where: {
              ModuleKey: dto.moduleKey,
              IsEnabled: true,
            },
            order: {
              CreatedAt: 'DESC',
            },
          }),
        );

        if (modules.length === 0) {
          throw new Error(`No enabled module found with key: ${dto.moduleKey}`);
        }

        module = modules[0];
      }

      // Create ModuleRun
      const moduleRunData = {
        ProjectID: projectId,
        PersonID: personId,
        TriggeredByUserID: dto.triggeredByUserId,
        ModuleKey: module.ModuleKey,
        ModuleVersion: module.Version,
        Status: ModuleRunStatus.QUEUED,
        InputConfigJson: dto.inputConfigJson,
      };

      const moduleRun = await Promisify<ModuleRun>(
        this.moduleRunRepoService.create(moduleRunData),
      );

      // Enqueue job
      await this.moduleRunsQueue.add(QUEUE_JOB_NAMES.EXECUTE_MODULE_RUN, {
        moduleRunId: moduleRun.ModuleRunID,
      });

      this.logger.info('ModuleRunnerService.createModuleRun success', {
        moduleRunId: moduleRun.ModuleRunID,
      });
      return { error: null, data: moduleRun };
    } catch (error) {
      this.logger.error('ModuleRunnerService.createModuleRun error', {
        error: error.message,
        projectId,
        personId,
      });
      return { error: error, data: null };
    }
  }

  async getModuleRunById(runId: number): Promise<ResultWithError> {
    try {
      this.logger.info('ModuleRunnerService.getModuleRunById called', {
        runId,
      });

      const moduleRun = await Promisify<ModuleRun>(
        this.moduleRunRepoService.get({ where: { ModuleRunID: runId } }, true),
      );

      this.logger.info('ModuleRunnerService.getModuleRunById success', {
        runId,
      });
      return { error: null, data: moduleRun };
    } catch (error) {
      this.logger.error('ModuleRunnerService.getModuleRunById error', {
        error: error.message,
        runId,
      });
      return { error: error, data: null };
    }
  }

  async listModuleRuns(
    projectId: number,
    personId: number,
    filters: ListModuleRunsQueryDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('ModuleRunnerService.listModuleRuns called', {
        projectId,
        personId,
        filters,
      });

      const whereConditions: any = {
        ProjectID: projectId,
        PersonID: personId,
      };

      if (filters.status) {
        whereConditions.Status = filters.status;
      }

      if (filters.moduleKey) {
        whereConditions.ModuleKey = filters.moduleKey;
      }

      const limit = filters.limit || 20;

      const moduleRuns = await Promisify<ModuleRun[]>(
        this.moduleRunRepoService.getAll({
          where: whereConditions,
          take: limit,
          order: {
            CreatedAt: 'DESC',
          },
        }),
      );

      this.logger.info('ModuleRunnerService.listModuleRuns success', {
        projectId,
        personId,
        count: moduleRuns.length,
      });
      return { error: null, data: moduleRuns };
    } catch (error) {
      this.logger.error('ModuleRunnerService.listModuleRuns error', {
        error: error.message,
        projectId,
        personId,
      });
      return { error: error, data: null };
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { In, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { QueueNames, QUEUE_JOB_NAMES } from '../common/constants';
import {
  FlowRunStatus,
  ModuleRunStatus,
} from '../common/constants/entity.constants';
import { FlowRunRepoService } from '../repo/flow-run-repo.service';
import { ModuleRunRepoService } from '../repo/module-run-repo.service';
import { CreateIndexerFlowDto } from './dto/create-indexer-flow.dto';
import { FlowRun } from '../repo/entities/flow-run.entity';
import { ModuleRun } from '../repo/entities/module-run.entity';
import { ClaimRepoService } from '../repo/claim-repo.service';
import { CLAIM_KEY } from '../common/types/claim-types';
import { Claim } from '../repo/entities/claim.entity';
import { DEFAULT_FLOW_KEY } from './indexer-flow.constants';

export interface FlowRunCreateResult {
  flowRunId: number;
  flowKey: string;
  jobId: string;
}

export interface FlowRunStatusResult {
  flowRunId: number;
  flowKey: string;
  status: FlowRunStatus;
  progress: number;
  currentModules: Array<{
    moduleRunId: number;
    moduleKey: string;
    startedAt: Date | null;
  }>;
  finalSummary: Record<string, unknown> | null;
  summary: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
  };
  moduleRuns: Array<{
    moduleRunId: number;
    moduleKey: string;
    status: ModuleRunStatus;
    error: Record<string, unknown> | null;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>;
}

@Injectable()
export class IndexerJobService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.INDEXER_FLOWS) private indexerFlowsQueue: Queue,
    private flowRunRepoService: FlowRunRepoService,
    private moduleRunRepoService: ModuleRunRepoService,
    private claimRepoService: ClaimRepoService,
  ) {}

  async createFlowRun(dto: CreateIndexerFlowDto): Promise<ResultWithError> {
    try {
      const flowKey = dto.flowKey || DEFAULT_FLOW_KEY;

      this.logger.info(
        `IndexerJobService.createFlowRun: Creating flow run [flowKey=${flowKey}, projectId=${dto.projectId}, personId=${dto.personId}]`,
      );

      const flowRun = await Promisify<FlowRun>(
        this.flowRunRepoService.create({
          ProjectID: dto.projectId,
          PersonID: dto.personId,
          TriggeredByUserID: dto.triggeredByUserId,
          FlowKey: flowKey,
          InputSummaryJson: {
            profileUrl: dto.profileUrl,
            companyName: dto.companyName || null,
            companyDomain: dto.companyDomain || null,
            companyDescription: dto.companyDescription || null,
            experimentDescription: dto.experimentDescription || null,
          },
          Status: FlowRunStatus.QUEUED,
        }),
      );

      const job = await this.indexerFlowsQueue.add(
        QUEUE_JOB_NAMES.RUN_INDEXER_FLOW,
        { flowRunId: flowRun.FlowRunID },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );

      return {
        error: null,
        data: {
          flowRunId: flowRun.FlowRunID,
          flowKey,
          jobId: job.id.toString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `IndexerJobService.createFlowRun: Error [error=${error.message}]`,
      );
      return { error, data: null };
    }
  }

  async getFlowRunStatus(flowRunId: number): Promise<ResultWithError> {
    try {
      const flowRun = await Promisify<FlowRun>(
        this.flowRunRepoService.get({ where: { FlowRunID: flowRunId } }, true),
      );

      this.logger.info(
        `IndexerJobService.getFlowRunStatus: Retrieved flow run [flowRunId=${flowRunId}, projectId=${flowRun.ProjectID}, personId=${flowRun.PersonID}]`,
      );

      // Get all module runs for this flow run by checking _flowRunId in InputConfigJson
      const allModuleRuns = await Promisify<ModuleRun[]>(
        this.moduleRunRepoService.getAll(
          {
            where: {
              ProjectID: flowRun.ProjectID,
              PersonID: flowRun.PersonID,
            },
            order: { CreatedAt: 'ASC' },
          },
          false,
        ),
      );

      this.logger.info(
        `IndexerJobService.getFlowRunStatus: Found ${allModuleRuns.length} module runs for project/person`,
      );

      // Filter to only module runs belonging to this flow
      const moduleRuns = allModuleRuns.filter(
        (mr) => mr.InputConfigJson?._flowRunId === flowRunId,
      );

      this.logger.info(
        `IndexerJobService.getFlowRunStatus: Filtered to ${moduleRuns.length} module runs for this flow`,
      );

      const summary = this.getModuleRunSummary(moduleRuns);
      const derivedStatus = this.deriveFlowStatus(summary);

      // Get final summary claim that was created by a module run from THIS flow
      let finalSummaryClaim: Claim | null = null;
      if (moduleRuns.length > 0) {
        const moduleRunIds = moduleRuns.map((mr) => mr.ModuleRunID);
        const allClaims = await Promisify<Claim[]>(
          this.claimRepoService.getAll(
            {
              where: {
                ProjectID: flowRun.ProjectID,
                PersonID: flowRun.PersonID,
                ClaimType: CLAIM_KEY.INSIGHTS_FINAL_SUMMARY,
                ModuleRunID: In(moduleRunIds),
                SupersededAt: IsNull(),
              },
              order: { CreatedAt: 'DESC' },
            },
            false,
          ),
        );
        finalSummaryClaim = allClaims.length > 0 ? allClaims[0] : null;
      }

      await Promisify(
        this.flowRunRepoService.update(
          { FlowRunID: flowRun.FlowRunID },
          {
            Status: derivedStatus,
            FinishedAt:
              derivedStatus === FlowRunStatus.COMPLETED ||
              derivedStatus === FlowRunStatus.FAILED
                ? new Date()
                : null,
            ModulesCompletedJson: summary.completed.map((run) => ({
              moduleRunId: run.ModuleRunID,
              moduleKey: run.ModuleKey,
            })),
            ModulesFailedJson: summary.failed.map((run) => ({
              moduleRunId: run.ModuleRunID,
              moduleKey: run.ModuleKey,
            })),
            FailureReasonsJson: summary.failed.map((run) => ({
              moduleRunId: run.ModuleRunID,
              moduleKey: run.ModuleKey,
              error: run.ErrorJson || null,
            })),
            FinalSummaryJson: finalSummaryClaim?.ValueJson || null,
          },
        ),
      );

      const finalSummaryValue = finalSummaryClaim?.ValueJson
        ? (finalSummaryClaim.ValueJson as Record<string, unknown>)
        : null;

      // Calculate progress percentage
      const progress =
        summary.total > 0
          ? Math.round((summary.completed.length / summary.total) * 100)
          : 0;

      // Get currently running modules
      const currentModules = summary.running.map((run) => ({
        moduleRunId: run.ModuleRunID,
        moduleKey: run.ModuleKey,
        startedAt: run.StartedAt || null,
      }));

      return {
        error: null,
        data: {
          flowRunId: flowRun.FlowRunID,
          flowKey: flowRun.FlowKey,
          status: derivedStatus,
          progress,
          currentModules,
          finalSummary: finalSummaryValue,
          summary: {
            total: summary.total,
            completed: summary.completed.length,
            failed: summary.failed.length,
            running: summary.running.length,
            queued: summary.queued.length,
          },
          moduleRuns: moduleRuns.map((run) => ({
            moduleRunId: run.ModuleRunID,
            moduleKey: run.ModuleKey,
            status: run.Status,
            error: run.ErrorJson || null,
            startedAt: run.StartedAt || null,
            finishedAt: run.FinishedAt || null,
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `IndexerJobService.getFlowRunStatus: Error [error=${error.message}]`,
      );
      return { error, data: null };
    }
  }

  private getModuleRunSummary(moduleRuns: ModuleRun[]) {
    const completed = moduleRuns.filter(
      (run) => run.Status === ModuleRunStatus.COMPLETED,
    );
    const failed = moduleRuns.filter(
      (run) => run.Status === ModuleRunStatus.FAILED,
    );
    const running = moduleRuns.filter(
      (run) => run.Status === ModuleRunStatus.RUNNING,
    );
    const queued = moduleRuns.filter(
      (run) => run.Status === ModuleRunStatus.QUEUED,
    );

    return {
      total: moduleRuns.length,
      completed,
      failed,
      running,
      queued,
    };
  }

  private deriveFlowStatus(summary: {
    total: number;
    completed: ModuleRun[];
    failed: ModuleRun[];
    running: ModuleRun[];
    queued: ModuleRun[];
  }): FlowRunStatus {
    if (summary.failed.length > 0) {
      return FlowRunStatus.FAILED;
    }

    if (summary.total > 0 && summary.completed.length === summary.total) {
      return FlowRunStatus.COMPLETED;
    }

    if (summary.running.length > 0) {
      return FlowRunStatus.RUNNING;
    }

    return FlowRunStatus.QUEUED;
  }
}

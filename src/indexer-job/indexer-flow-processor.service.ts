import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { FlowRunRepoService } from '../repo/flow-run-repo.service';
import { ModuleRepoService } from '../repo/module-repo.service';
import { ModuleRunRepoService } from '../repo/module-run-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { PersonRepoService } from '../repo/person-repo.service';
import { PersonProjectRepoService } from '../repo/person-project-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import { FlowRun } from '../repo/entities/flow-run.entity';
import { Module } from '../repo/entities/module.entity';
import { ModuleRun } from '../repo/entities/module-run.entity';
import { Document } from '../repo/entities/document.entity';
import { QueueNames, QUEUE_JOB_NAMES } from '../common/constants';
import {
  FlowRunStatus,
  ModuleRunStatus,
  ModuleScope,
} from '../common/constants/entity.constants';
import { FlowStage, STAGE_MODULES } from './indexer-flow.constants';
import { DocumentsService } from '../documents/documents.service';
import { DocumentKind, DocumentSource } from '../common/types/document.types';
import { AIService } from '../ai/ai.service';
import { AI_MODEL, AI_PROVIDER, AI_TASK } from '../common/types/ai.types';
import {
  buildFlowFilterPrompt,
  FlowFilterEvidence,
} from '../ai/prompts/flow-filter.prompt';

@Injectable()
export class IndexerFlowProcessorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.MODULE_RUNS) private moduleRunsQueue: Queue,
    private flowRunRepoService: FlowRunRepoService,
    private moduleRepoService: ModuleRepoService,
    private moduleRunRepoService: ModuleRunRepoService,
    private documentsService: DocumentsService,
    private aiService: AIService,
    private projectRepoService: ProjectRepoService,
    private personRepoService: PersonRepoService,
    private personProjectRepoService: PersonProjectRepoService,
    private userRepoService: UserRepoService,
  ) {}

  async processFlowRun(flowRunId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `IndexerFlowProcessorService.processFlowRun: Starting [flowRunId=${flowRunId}]`,
      );

      const flowRun = await Promisify<FlowRun>(
        this.flowRunRepoService.get({ where: { FlowRunID: flowRunId } }, true),
      );

      await this.validateFlowRun(flowRun);

      // Determine current stage - start with CONNECTORS
      const currentStage = FlowStage.CONNECTORS;
      const moduleKeys = STAGE_MODULES[currentStage];

      const moduleRuns: Array<{ moduleKey: string; moduleRunId: number }> = [];

      for (const moduleKey of moduleKeys) {
        const module = await this.getLatestEnabledModule(moduleKey);
        const moduleRun = await this.createModuleRun(flowRun, module);

        moduleRuns.push({
          moduleKey: module.ModuleKey,
          moduleRunId: moduleRun.ModuleRunID,
        });

        await this.moduleRunsQueue.add(QUEUE_JOB_NAMES.EXECUTE_MODULE_RUN, {
          moduleRunId: moduleRun.ModuleRunID,
        });
      }

      await Promisify(
        this.flowRunRepoService.update(
          { FlowRunID: flowRun.FlowRunID },
          {
            Status: FlowRunStatus.RUNNING,
            StartedAt: new Date(),
            ModulesScheduledJson: moduleRuns,
            InputSummaryJson: {
              ...flowRun.InputSummaryJson,
              currentStage,
            },
          },
        ),
      );

      this.logger.info(
        `IndexerFlowProcessorService.processFlowRun: Scheduled ${currentStage} modules [flowRunId=${flowRun.FlowRunID}, count=${moduleRuns.length}]`,
      );

      return { error: null, data: moduleRuns };
    } catch (error) {
      this.logger.error(
        `IndexerFlowProcessorService.processFlowRun: Error [error=${error.message}, flowRunId=${flowRunId}]`,
      );

      await Promisify(
        this.flowRunRepoService.update(
          { FlowRunID: flowRunId },
          {
            Status: FlowRunStatus.FAILED,
            FinishedAt: new Date(),
            ErrorJson: { message: error.message, stack: error.stack },
          },
        ),
      );

      return { error, data: null };
    }
  }

  private async validateFlowRun(flowRun: FlowRun): Promise<void> {
    await Promisify(
      this.projectRepoService.get(
        { where: { ProjectID: flowRun.ProjectID } },
        true,
      ),
    );

    if (flowRun.TriggeredByUserID) {
      await Promisify(
        this.userRepoService.get(
          { where: { UserID: flowRun.TriggeredByUserID } },
          true,
        ),
      );
    }

    if (!flowRun.PersonID) {
      throw new Error('Flow run is missing PersonID');
    }

    await Promisify(
      this.personRepoService.get(
        { where: { PersonID: flowRun.PersonID } },
        true,
      ),
    );

    const personProject = await Promisify(
      this.personProjectRepoService.get(
        {
          where: {
            ProjectID: flowRun.ProjectID,
            PersonID: flowRun.PersonID,
          },
        },
        false,
      ),
    );

    if (!personProject) {
      throw new Error(
        `Person ${flowRun.PersonID} is not associated with project ${flowRun.ProjectID}`,
      );
    }
  }

  private async getLatestEnabledModule(moduleKey: string): Promise<Module> {
    const modules = await Promisify<Module[]>(
      this.moduleRepoService.getAll({
        where: {
          ModuleKey: moduleKey,
          IsEnabled: true,
        },
        order: { CreatedAt: 'DESC' },
      }),
    );

    if (!modules.length) {
      throw new Error(`No enabled module found with key: ${moduleKey}`);
    }

    return modules[0];
  }

  private async createModuleRun(
    flowRun: FlowRun,
    module: Module,
  ): Promise<ModuleRun> {
    if (module.Scope === ModuleScope.PROJECT_LEVEL) {
      throw new Error(
        `Module ${module.ModuleKey} is PROJECT_LEVEL and cannot run in person flow`,
      );
    }

    const inputConfig = this.buildInputConfig(
      module.ModuleKey,
      flowRun.InputSummaryJson?.profileUrl,
    );

    const moduleRun = await Promisify<ModuleRun>(
      this.moduleRunRepoService.create({
        ProjectID: flowRun.ProjectID,
        PersonID: flowRun.PersonID,
        TriggeredByUserID: flowRun.TriggeredByUserID || null,
        ModuleKey: module.ModuleKey,
        ModuleVersion: module.Version,
        Status: ModuleRunStatus.QUEUED,
        InputConfigJson: {
          ...inputConfig,
          _flowRunId: flowRun.FlowRunID, // Track which flow run this belongs to
        },
      }),
    );

    return moduleRun;
  }

  private buildInputConfig(moduleKey: string, profileUrl?: string): any {
    if (!profileUrl) {
      return {};
    }

    if (
      moduleKey === 'linkedin-profile-connector' ||
      moduleKey === 'linkedin-posts-connector'
    ) {
      return { profileUrl };
    }

    return {};
  }

  /**
   * Progress flow to next stage after current stage completes
   */
  async progressFlowStage(flowRunId: number): Promise<ResultWithError> {
    try {
      const flowRun = await Promisify<FlowRun>(
        this.flowRunRepoService.get({ where: { FlowRunID: flowRunId } }, true),
      );

      const currentStage =
        flowRun.InputSummaryJson?.currentStage || FlowStage.CONNECTORS;
      const nextStage = this.getNextStage(currentStage);

      if (nextStage === FlowStage.COMPLETED) {
        this.logger.info(
          `IndexerFlowProcessorService.progressFlowStage: All stages complete [flowRunId=${flowRunId}]`,
        );

        await Promisify(
          this.flowRunRepoService.update(
            { FlowRunID: flowRunId },
            {
              Status: FlowRunStatus.COMPLETED,
              FinishedAt: new Date(),
            },
          ),
        );

        return { error: null, data: { completed: true } };
      }

      const moduleKeys = STAGE_MODULES[nextStage];
      const moduleRuns: Array<{ moduleKey: string; moduleRunId: number }> = [];

      for (const moduleKey of moduleKeys) {
        const module = await this.getLatestEnabledModule(moduleKey);
        const moduleRun = await this.createModuleRun(flowRun, module);

        moduleRuns.push({
          moduleKey: module.ModuleKey,
          moduleRunId: moduleRun.ModuleRunID,
        });

        await this.moduleRunsQueue.add(QUEUE_JOB_NAMES.EXECUTE_MODULE_RUN, {
          moduleRunId: moduleRun.ModuleRunID,
        });
      }

      await Promisify(
        this.flowRunRepoService.update(
          { FlowRunID: flowRunId },
          {
            InputSummaryJson: {
              ...flowRun.InputSummaryJson,
              currentStage: nextStage,
            },
          },
        ),
      );

      this.logger.info(
        `IndexerFlowProcessorService.progressFlowStage: Progressed to ${nextStage} [flowRunId=${flowRunId}, count=${moduleRuns.length}]`,
      );

      return { error: null, data: { stage: nextStage, moduleRuns } };
    } catch (error) {
      this.logger.error(
        `IndexerFlowProcessorService.progressFlowStage: Error [error=${error.message}, flowRunId=${flowRunId}]`,
      );
      return { error, data: null };
    }
  }

  /**
   * Check if current stage is complete and progress if needed
   */
  async checkAndProgressStage(flowRunId: number): Promise<ResultWithError> {
    try {
      const flowRun = await Promisify<FlowRun>(
        this.flowRunRepoService.get({ where: { FlowRunID: flowRunId } }, true),
      );

      const currentStage =
        flowRun.InputSummaryJson?.currentStage || FlowStage.CONNECTORS;
      const moduleKeys = STAGE_MODULES[currentStage];

      // Get all module runs for this flow (filter by _flowRunId in InputConfigJson)
      const allModuleRuns = await Promisify<ModuleRun[]>(
        this.moduleRunRepoService.getAll({
          where: {
            ProjectID: flowRun.ProjectID,
            PersonID: flowRun.PersonID,
          },
        }),
      );

      // Filter to only module runs belonging to this flow run
      const flowModuleRuns = allModuleRuns.filter(
        (mr) => mr.InputConfigJson?._flowRunId === flowRunId,
      );

      // Check if all modules in current stage are complete
      const stageModuleRuns = flowModuleRuns.filter((mr) =>
        moduleKeys.includes(mr.ModuleKey),
      );

      if (stageModuleRuns.length === 0) {
        this.logger.warn(
          `IndexerFlowProcessorService.checkAndProgressStage: No module runs found for stage ${currentStage} [flowRunId=${flowRunId}]`,
        );
        return { error: null, data: { stageComplete: false } };
      }

      const allComplete = stageModuleRuns.every(
        (mr) =>
          mr.Status === ModuleRunStatus.COMPLETED ||
          mr.Status === ModuleRunStatus.FAILED,
      );

      const anyFailed = stageModuleRuns.some(
        (mr) => mr.Status === ModuleRunStatus.FAILED,
      );

      if (!allComplete) {
        this.logger.info(
          `IndexerFlowProcessorService.checkAndProgressStage: Stage ${currentStage} not complete yet [flowRunId=${flowRunId}, completed=${
            stageModuleRuns.filter(
              (mr) => mr.Status === ModuleRunStatus.COMPLETED,
            ).length
          }/${stageModuleRuns.length}]`,
        );
        return { error: null, data: { stageComplete: false } };
      }

      if (anyFailed) {
        this.logger.error(
          `IndexerFlowProcessorService.checkAndProgressStage: Stage ${currentStage} has failures [flowRunId=${flowRunId}]`,
        );

        await Promisify(
          this.flowRunRepoService.update(
            { FlowRunID: flowRunId },
            {
              Status: FlowRunStatus.FAILED,
              FinishedAt: new Date(),
              ErrorJson: {
                message: `Stage ${currentStage} had module failures`,
              } as any,
            },
          ),
        );

        return {
          error: new Error(`Stage ${currentStage} had failures`),
          data: null,
        };
      }

      this.logger.info(
        `IndexerFlowProcessorService.checkAndProgressStage: Stage ${currentStage} complete, progressing [flowRunId=${flowRunId}]`,
      );

      if (currentStage === FlowStage.CONNECTORS) {
        const filterInstructions =
          flowRun.InputSummaryJson?.filterInstructions || null;

        if (filterInstructions) {
          const existingFilterResult =
            flowRun.InputSummaryJson?.filterResult || null;

          const filterResult = existingFilterResult
            ? existingFilterResult
            : await this.evaluateFlowFilters(flowRun, filterInstructions);

          if (!existingFilterResult) {
            await Promisify(
              this.flowRunRepoService.update(
                { FlowRunID: flowRunId },
                {
                  InputSummaryJson: {
                    ...flowRun.InputSummaryJson,
                    filterResult,
                  },
                },
              ),
            );
          }

          if (!filterResult.shouldProceed) {
            this.logger.info(
              `IndexerFlowProcessorService.checkAndProgressStage: Flow filtered out [flowRunId=${flowRunId}, reason=${filterResult.reason}]`,
            );

            await Promisify(
              this.flowRunRepoService.update(
                { FlowRunID: flowRunId },
                {
                  Status: FlowRunStatus.FAILED,
                  FinishedAt: new Date(),
                  ErrorJson: {
                    message: `Filtered out: ${filterResult.reason}`,
                    filterResult,
                  } as any,
                },
              ),
            );

            return {
              error: new Error(`Filtered out: ${filterResult.reason}`),
              data: null,
            };
          }
        }
      }

      return await this.progressFlowStage(flowRunId);
    } catch (error) {
      this.logger.error(
        `IndexerFlowProcessorService.checkAndProgressStage: Error [error=${error.message}, flowRunId=${flowRunId}]`,
      );
      return { error, data: null };
    }
  }

  private getNextStage(currentStage: FlowStage): FlowStage {
    switch (currentStage) {
      case FlowStage.CONNECTORS:
        return FlowStage.ENRICHERS;
      case FlowStage.ENRICHERS:
        return FlowStage.COMPOSERS;
      case FlowStage.COMPOSERS:
        return FlowStage.COMPLETED;
      default:
        return FlowStage.COMPLETED;
    }
  }

  private async evaluateFlowFilters(
    flowRun: FlowRun,
    filterInstructions: string,
  ): Promise<{
    shouldProceed: boolean;
    reason: string;
    confidence: number;
    unsupportedFilters?: string[];
  }> {
    const profileDocument = await Promisify<Document>(
      this.documentsService.getLatestValidDocument({
        projectId: flowRun.ProjectID,
        personId: flowRun.PersonID,
        source: DocumentSource.LINKEDIN,
        documentKind: DocumentKind.LINKEDIN_PROFILE,
      }),
    );

    let postsDocument: Document | null = null;
    try {
      postsDocument = await Promisify<Document>(
        this.documentsService.getLatestValidDocument({
          projectId: flowRun.ProjectID,
          personId: flowRun.PersonID,
          source: DocumentSource.LINKEDIN,
          documentKind: DocumentKind.LINKEDIN_POSTS,
        }),
      );
    } catch {
      postsDocument = null;
    }

    const profilePayload = Array.isArray(profileDocument.PayloadJson)
      ? profileDocument.PayloadJson[0]
      : profileDocument.PayloadJson;

    const postsPayload = postsDocument?.PayloadJson || {};
    const recentPosts = Array.isArray(postsPayload)
      ? postsPayload
      : postsPayload?.recentPosts || [];
    const recentReposts = Array.isArray(profilePayload?.recentReposts)
      ? profilePayload.recentReposts
      : postsPayload?.recentReposts || [];

    const evidence: FlowFilterEvidence = {
      profile: profilePayload || {},
      recentPosts: recentPosts.map((post: any) => ({
        postUrl: post.postUrl || post.url || null,
        text: post.text || post.content || null,
        createdAt: post.createdAt || null,
      })),
      recentReposts: recentReposts.map((post: any) => ({
        postUrl: post.postUrl || post.url || null,
        text: post.text || post.content || null,
        createdAt: post.createdAt || null,
      })),
      filterInstructions,
    };

    const prompt = buildFlowFilterPrompt(evidence);

    const aiResponse = await this.aiService.run({
      provider: AI_PROVIDER.OPENAI,
      model: AI_MODEL.GPT_4O_MINI,
      taskType: AI_TASK.FLOW_FILTER,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: 0,
      maxTokens: 300,
    });

    const parsed = this.parseJsonResponse(aiResponse.rawText);

    return {
      shouldProceed: Boolean(parsed?.shouldProceed),
      reason: String(parsed?.reason || 'No reason provided'),
      confidence: Number(parsed?.confidence ?? 0.5),
      unsupportedFilters: Array.isArray(parsed?.unsupportedFilters)
        ? parsed.unsupportedFilters
        : [],
    };
  }

  private parseJsonResponse(rawText: string): any {
    try {
      return JSON.parse(rawText);
    } catch (error) {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw error;
    }
  }
}

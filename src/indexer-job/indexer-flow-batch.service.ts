import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { Promisify } from '../common/helpers/promisifier';
import { safeNormalizeLinkedinUrl } from '../common/helpers/linkedinUrl';
import { EntityStatus } from '../common/constants/entity.constants';
import { PersonRepoService } from '../repo/person-repo.service';
import { PersonProjectRepoService } from '../repo/person-project-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import {
  FlowRunCreateResult,
  FlowRunStatusResult,
  IndexerJobService,
} from './indexer-job.service';
import { CreateIndexerFlowsDto } from './dto/create-indexer-flows.dto';
import { Person } from '../repo/entities/person.entity';
import { PersonProject } from '../repo/entities/person-project.entity';
import { randomUUID } from 'crypto';
import { FlowRunRepoService } from '../repo/flow-run-repo.service';
import { FlowRun } from '../repo/entities/flow-run.entity';
import { AIService } from '../ai/ai.service';
import {
  AI_MODEL_MEGALLM,
  AI_MODEL_OPENAI,
  AI_PROVIDER,
  AI_TASK,
} from '../common/types/ai.types';
import { QueryFlowSetDto } from './dto/query-flow-set.dto';

export interface IndexerFlowBatchResultItem {
  input: string;
  personId?: number;
  flowRunId?: number;
  flowKey?: string;
  jobId?: string;
  error?: string;
}

export interface IndexerFlowSetResult {
  flowSetId: string;
  items: IndexerFlowBatchResultItem[];
}

interface ResolvedPersonPayload {
  person: Person;
  profileUrlForFlow: string;
}

@Injectable()
export class IndexerFlowBatchService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private personRepoService: PersonRepoService,
    private personProjectRepoService: PersonProjectRepoService,
    private projectRepoService: ProjectRepoService,
    private userRepoService: UserRepoService,
    private indexerJobService: IndexerJobService,
    private flowRunRepoService: FlowRunRepoService,
    private aiService: AIService,
  ) {}

  async createFlows(dto: CreateIndexerFlowsDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `IndexerFlowBatchService.createFlows: Starting [projectId=${dto.projectId}, count=${dto.profileUrls.length}]`,
      );

      await Promisify(
        this.projectRepoService.get(
          { where: { ProjectID: dto.projectId } },
          true,
        ),
      );

      if (dto.triggeredByUserId) {
        await Promisify(
          this.userRepoService.get(
            { where: { UserID: dto.triggeredByUserId } },
            true,
          ),
        );
      }

      const results: IndexerFlowBatchResultItem[] = [];
      const flowSetId = randomUUID();

      for (const input of dto.profileUrls) {
        try {
          const resolution = await Promisify<ResolvedPersonPayload>(
            this.resolvePerson(input, dto.triggeredByUserId),
          );

          await Promisify<PersonProject>(
            this.attachPersonToProject(
              dto.projectId,
              resolution.person.PersonID,
              dto.triggeredByUserId,
            ),
          );

          const flowResult = await Promisify<FlowRunCreateResult>(
            this.indexerJobService.createFlowRun({
              projectId: dto.projectId,
              personId: resolution.person.PersonID,
              profileUrl: resolution.profileUrlForFlow,
              triggeredByUserId: dto.triggeredByUserId,
              flowKey: dto.flowKey,
              companyName: dto.companyName,
              companyDomain: dto.companyDomain,
              filterInstructions: dto.filterInstructions,
              flowSetId,
            }),
          );

          results.push({
            input,
            personId: resolution.person.PersonID,
            flowRunId: flowResult.flowRunId,
            flowKey: flowResult.flowKey,
            jobId: flowResult.jobId,
          });
        } catch (error) {
          results.push({
            input,
            error: error.message || 'Failed to create flow',
          });
        }
      }

      return { error: null, data: { flowSetId, items: results } };
    } catch (error) {
      this.logger.error(
        `IndexerFlowBatchService.createFlows: Error [error=${error.message}]`,
      );
      return { error, data: null };
    }
  }

  private async resolvePerson(
    input: string,
    createdByUserId: number,
  ): Promise<ResultWithError> {
    try {
      const trimmed = (input || '').trim();
      const isUrn = trimmed.toLowerCase().startsWith('urn:');

      if (isUrn) {
        const existingByUrn = await Promisify<Person | null>(
          this.personRepoService.get(
            { where: { ExternalUrn: trimmed } },
            false,
          ),
        );

        if (existingByUrn) {
          return {
            error: null,
            data: {
              person: existingByUrn,
              profileUrlForFlow: existingByUrn.LinkedinUrl || trimmed,
            },
          };
        }

        const person = await Promisify<Person>(
          this.personRepoService.create({
            LinkedinUrl: trimmed,
            ExternalUrn: trimmed,
            Status: EntityStatus.ACTIVE,
            CreatedByUserID: createdByUserId || null,
          }),
        );

        return {
          error: null,
          data: {
            person,
            profileUrlForFlow: trimmed,
          },
        };
      }

      const normalizedUrl = safeNormalizeLinkedinUrl(trimmed);
      if (!normalizedUrl) {
        return {
          error: new Error(`Invalid LinkedIn profile URL or URN: ${trimmed}`),
          data: null,
        };
      }

      const existingByUrl = await Promisify<Person | null>(
        this.personRepoService.get(
          { where: { LinkedinUrl: normalizedUrl } },
          false,
        ),
      );

      if (existingByUrl) {
        return {
          error: null,
          data: { person: existingByUrl, profileUrlForFlow: normalizedUrl },
        };
      }

      const person = await Promisify<Person>(
        this.personRepoService.create({
          LinkedinUrl: normalizedUrl,
          Status: EntityStatus.ACTIVE,
          CreatedByUserID: createdByUserId || null,
        }),
      );

      return {
        error: null,
        data: { person, profileUrlForFlow: normalizedUrl },
      };
    } catch (error) {
      this.logger.error(
        `IndexerFlowBatchService.resolvePerson: Error [error=${error.message}]`,
      );
      return { error, data: null };
    }
  }

  private async attachPersonToProject(
    projectId: number,
    personId: number,
    createdByUserId: number,
  ): Promise<ResultWithError> {
    const existing = await Promisify<PersonProject | null>(
      this.personProjectRepoService.get(
        { where: { ProjectID: projectId, PersonID: personId } },
        false,
      ),
    );

    if (existing) {
      return { data: existing, error: null };
    }

    return this.personProjectRepoService.create({
      ProjectID: projectId,
      PersonID: personId,
      CreatedByUserID: createdByUserId || null,
    });
  }

  async getFlowSetStatus(flowSetId: string): Promise<ResultWithError> {
    try {
      const flows = await Promisify<FlowRun[]>(
        this.flowRunRepoService.getAll(
          {
            where: {
              FlowSetID: flowSetId,
            },
            order: { CreatedAt: 'ASC' },
          },
          false,
        ),
      );

      const items: FlowRunStatusResult[] = [];

      for (const flow of flows) {
        const status = await Promisify<FlowRunStatusResult>(
          this.indexerJobService.getFlowRunStatus(flow.FlowRunID),
        );
        items.push(status);
      }

      return {
        error: null,
        data: {
          flowSetId,
          total: items.length,
          items,
        },
      };
    } catch (error) {
      this.logger.error(
        `IndexerFlowBatchService.getFlowSetStatus: Error [error=${error.message}]`,
      );
      return { error, data: null };
    }
  }

  async queryFlowSet(dto: QueryFlowSetDto): Promise<ResultWithError> {
    try {
      const flowSetId = dto.flowSetId?.trim();
      const question = dto.question?.trim();

      if (!flowSetId || !question) {
        return {
          error: new Error('flowSetId and question are required'),
          data: null,
        };
      }

      const statusResult = await Promisify<any>(
        this.getFlowSetStatus(flowSetId),
      );
      const items = statusResult?.items || [];

      const summaries = items.map((item: any) => {
        const summary =
          item?.finalSummary?.finalSummary || item?.finalSummary || null;
        return {
          flowRunId: item?.flowRunId || null,
          personId: item?.personId || null,
          profileUrl: item?.profileUrl || null,
          status: item?.status || null,
          progress: item?.progress ?? null,
          summaryCounts: item?.summary || null,
          finalSummary: summary,
          moduleRuns: Array.isArray(item?.moduleRuns)
            ? item.moduleRuns.map((run: any) => ({
                moduleKey: run?.moduleKey || null,
                status: run?.status || null,
                error: run?.error || null,
              }))
            : [],
        };
      });

      const systemPrompt = `You answer questions using ONLY the provided enriched data (module outputs) and composed summaries.
    If the data is missing, say so. When recommending candidates, return a short list with profileUrl and 1-2 sentence justification.`;

      const userPrompt = `Question:\n${question}\n\nComposed summaries (JSON):\n${JSON.stringify(
        summaries,
      )}`;

      const provider = dto.provider || AI_PROVIDER.OPENAI;
      const model =
        dto.model ||
        (provider === AI_PROVIDER.MEGALLM
          ? AI_MODEL_MEGALLM.OPENAI_GPT_OSS_120B
          : AI_MODEL_OPENAI.GPT_4O);

      const aiResponse = await this.aiService.run({
        provider,
        model,
        taskType: AI_TASK.TEXT_SUMMARIZATION,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 600,
      });

      return {
        error: null,
        data: {
          flowSetId,
          answer: aiResponse.rawText,
        },
      };
    } catch (error) {
      this.logger.error(
        `IndexerFlowBatchService.queryFlowSet: Error [error=${error.message}]`,
      );
      return { error, data: null };
    }
  }
}

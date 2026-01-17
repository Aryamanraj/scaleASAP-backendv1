/**
 * LinkedIn Digital Identity Enricher Service
 * Infers Digital Identity signals from LinkedIn profile data
 */

import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DocumentsService } from '../../../documents/documents.service';
import { ClaimRepoService } from '../../../repo/claim-repo.service';
import { AIService } from '../../../ai/ai.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { Document } from '../../../repo/entities/document.entity';
import { Claim } from '../../../repo/entities/claim.entity';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ResultWithError } from '../../../common/interfaces';
import { DocumentSource, CLAIM_KEY } from '../../../common/types/claim-types';
import { DocumentKind } from '../../../common/types/document.types';
import { AI_PROVIDER, AI_MODEL, AI_TASK } from '../../../common/types/ai.types';

@Injectable()
export class LinkedinDigitalIdentityEnricherService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentsService: DocumentsService,
    private claimRepoService: ClaimRepoService,
    private aiService: AIService,
  ) {}

  async enrich(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.enrich: Starting enrichment [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      // Fetch latest valid LinkedIn profile document
      let document: Document;
      try {
        document = await Promisify<Document>(
          this.documentsService.getLatestValidDocument({
            projectId: run.ProjectID,
            personId: run.PersonID,
            source: DocumentSource.LINKEDIN,
            documentKind: DocumentKind.LINKEDIN_PROFILE,
          }),
        );
      } catch (error) {
        throw new Error(
          `No valid LinkedIn profile document found for projectId=${run.ProjectID}, personId=${run.PersonID}. Please run 'linkedin-profile-connector' first.`,
        );
      }

      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.enrich: Found document [documentId=${document.DocumentID}, capturedAt=${document.CapturedAt}]`,
      );

      const payload = document.PayloadJson;
      const claimsCreated: number[] = [];

      // Run each inference independently (failures should not stop others)
      await Promise.allSettled([
        this.inferEmailPattern(
          run.ProjectID,
          run.PersonID,
          payload,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          claimsCreated,
        ),
        this.inferProfilePhotoSignal(
          run.ProjectID,
          run.PersonID,
          payload,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          claimsCreated,
        ),
        this.inferBioEvolution(
          run.ProjectID,
          run.PersonID,
          payload,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          claimsCreated,
        ),
        this.inferDomainOwnership(
          run.ProjectID,
          run.PersonID,
          payload,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          claimsCreated,
        ),
      ]);

      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.enrich: Completed enrichment [moduleRunId=${run.ModuleRunID}, claimsCreated=${claimsCreated.length}]`,
      );

      return {
        error: null,
        data: {
          claimsCreated: claimsCreated.length,
          claimIds: claimsCreated,
        },
      };
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.enrich: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Infer email pattern from profile data
   */
  private async inferEmailPattern(
    projectId: number,
    personId: number,
    payload: any,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
    claimsCreated: number[],
  ): Promise<void> {
    try {
      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.inferEmailPattern: Starting [projectId=${projectId}, personId=${personId}]`,
      );

      const root = Array.isArray(payload) ? payload[0] : payload;
      const name = root?.basic_info?.fullname || root?.name || '';
      const company = root?.experience?.[0]?.companyName || '';

      if (!name) {
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferEmailPattern: Skipping due to missing name [projectId=${projectId}, personId=${personId}]`,
        );
        return;
      }

      const systemPrompt = `You are inferring likely email address patterns for a professional.
Based on their name and company, suggest the most likely email pattern formats they might use.
Output ONLY valid JSON.`;

      const userPrompt = `Infer email patterns for:
Name: ${name}
${company ? `Company: ${company}` : ''}

Return JSON:
{
  "likelyPatterns": ["pattern1", "pattern2"],
  "confidence": "LOW" | "MED" | "HIGH",
  "reasoning": "brief explanation"
}`;

      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O,
        taskType: AI_TASK.EMAIL_PATTERN_INFERENCE,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 200,
      });

      const parsedResponse = JSON.parse(aiResponse.rawText);

      const valueJsonWithMeta = {
        likelyPatterns: parsedResponse.likelyPatterns || [],
        confidence: parsedResponse.confidence,
        reasoning: parsedResponse.reasoning,
        _meta: {
          moduleRunId,
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed || 0,
        },
      };

      const claim = await this.writeSingleValueClaim(
        projectId,
        personId,
        CLAIM_KEY.DIGITAL_EMAIL_PATTERN,
        'single',
        valueJsonWithMeta,
        0.6,
        observedAt,
        sourceDocumentId,
        moduleRunId,
      );

      if (claim) {
        claimsCreated.push(claim.ClaimID);
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferEmailPattern: Created claim [claimId=${
            claim.ClaimID
          }, patterns=${parsedResponse.likelyPatterns?.length || 0}]`,
        );
      }
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.inferEmailPattern: Error [error=${error.message}, stack=${error.stack}]`,
      );
    }
  }

  /**
   * Analyze profile photo confidence signal
   */
  private async inferProfilePhotoSignal(
    projectId: number,
    personId: number,
    payload: any,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
    claimsCreated: number[],
  ): Promise<void> {
    try {
      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.inferProfilePhotoSignal: Starting [projectId=${projectId}, personId=${personId}]`,
      );

      const root = Array.isArray(payload) ? payload[0] : payload;
      const profilePhotoUrl =
        root?.basic_info?.profile_pic_url || root?.profilePictureUrl || '';

      if (!profilePhotoUrl) {
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferProfilePhotoSignal: No profile photo URL found [projectId=${projectId}, personId=${personId}]`,
        );
        return;
      }

      const systemPrompt = `You are analyzing LinkedIn profile photo URLs to determine authenticity signals.
Assess whether the URL pattern suggests a genuine, custom-uploaded photo or a default/placeholder.
Output ONLY valid JSON.`;

      const userPrompt = `Analyze this LinkedIn profile photo URL:
${profilePhotoUrl}

Return JSON:
{
  "hasCustomPhoto": boolean,
  "confidence": "LOW" | "MED" | "HIGH",
  "signals": ["signal1", "signal2"],
  "reasoning": "brief explanation"
}`;

      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O,
        taskType: AI_TASK.PROFILE_PHOTO_CONFIDENCE_SIGNAL,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 200,
      });

      const parsedResponse = JSON.parse(aiResponse.rawText);

      const valueJsonWithMeta = {
        hasCustomPhoto: parsedResponse.hasCustomPhoto,
        confidence: parsedResponse.confidence,
        signals: parsedResponse.signals || [],
        reasoning: parsedResponse.reasoning,
        photoUrl: profilePhotoUrl,
        _meta: {
          moduleRunId,
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed || 0,
        },
      };

      const claim = await this.writeGroupedClaim(
        projectId,
        personId,
        CLAIM_KEY.DIGITAL_PROFILE_PHOTO_SIGNAL,
        'profile_photo',
        valueJsonWithMeta,
        0.7,
        observedAt,
        sourceDocumentId,
        moduleRunId,
      );

      if (claim) {
        claimsCreated.push(claim.ClaimID);
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferProfilePhotoSignal: Created claim [claimId=${claim.ClaimID}, hasCustomPhoto=${parsedResponse.hasCustomPhoto}]`,
        );
      }
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.inferProfilePhotoSignal: Error [error=${error.message}, stack=${error.stack}]`,
      );
    }
  }

  /**
   * Analyze bio/headline evolution patterns
   */
  private async inferBioEvolution(
    projectId: number,
    personId: number,
    payload: any,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
    claimsCreated: number[],
  ): Promise<void> {
    try {
      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.inferBioEvolution: Starting [projectId=${projectId}, personId=${personId}]`,
      );

      const root = Array.isArray(payload) ? payload[0] : payload;
      const headline = root?.basic_info?.headline || root?.headline || '';
      const summary = root?.basic_info?.summary || root?.summary || '';

      if (!headline && !summary) {
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferBioEvolution: No bio data found [projectId=${projectId}, personId=${personId}]`,
        );
        return;
      }

      const systemPrompt = `You are analyzing LinkedIn bio/headline for activity and authenticity signals.
Assess writing style, completeness, and professionalism.
Output ONLY valid JSON.`;

      const userPrompt = `Analyze this LinkedIn bio:

Headline: ${headline}
Summary: ${summary.substring(0, 500)}

Return JSON:
{
  "activityLevel": "LOW" | "MED" | "HIGH",
  "professionalism": "LOW" | "MED" | "HIGH",
  "completeness": "LOW" | "MED" | "HIGH",
  "signals": ["signal1", "signal2"],
  "reasoning": "brief explanation"
}`;

      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O,
        taskType: AI_TASK.BIO_EVOLUTION_ANALYSIS,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 250,
      });

      const parsedResponse = JSON.parse(aiResponse.rawText);

      const valueJsonWithMeta = {
        activityLevel: parsedResponse.activityLevel,
        professionalism: parsedResponse.professionalism,
        completeness: parsedResponse.completeness,
        signals: parsedResponse.signals || [],
        reasoning: parsedResponse.reasoning,
        _meta: {
          moduleRunId,
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed || 0,
        },
      };

      const claim = await this.writeGroupedClaim(
        projectId,
        personId,
        CLAIM_KEY.DIGITAL_BIO_EVOLUTION,
        'bio',
        valueJsonWithMeta,
        0.65,
        observedAt,
        sourceDocumentId,
        moduleRunId,
      );

      if (claim) {
        claimsCreated.push(claim.ClaimID);
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferBioEvolution: Created claim [claimId=${claim.ClaimID}, activityLevel=${parsedResponse.activityLevel}]`,
        );
      }
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.inferBioEvolution: Error [error=${error.message}, stack=${error.stack}]`,
      );
    }
  }

  /**
   * Infer domain ownership from email or website patterns
   */
  private async inferDomainOwnership(
    projectId: number,
    personId: number,
    payload: any,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
    claimsCreated: number[],
  ): Promise<void> {
    try {
      this.logger.info(
        `LinkedinDigitalIdentityEnricherService.inferDomainOwnership: Starting [projectId=${projectId}, personId=${personId}]`,
      );

      const root = Array.isArray(payload) ? payload[0] : payload;
      const websites = root?.basic_info?.websites || root?.websites || [];
      const company = root?.experience?.[0]?.companyName || '';

      if (websites.length === 0 && !company) {
        this.logger.info(
          `LinkedinDigitalIdentityEnricherService.inferDomainOwnership: No domain data found [projectId=${projectId}, personId=${personId}]`,
        );
        return;
      }

      const systemPrompt = `You are inferring domain ownership from LinkedIn profile data.
Identify likely domains the person owns or controls based on their company and websites.
Output ONLY valid JSON.`;

      const userPrompt = `Infer domain ownership:

${company ? `Company: ${company}` : ''}
${websites.length > 0 ? `Websites: ${websites.join(', ')}` : ''}

Return JSON:
{
  "likelyDomains": ["domain1.com", "domain2.com"],
  "confidence": "LOW" | "MED" | "HIGH",
  "reasoning": "brief explanation"
}`;

      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O,
        taskType: AI_TASK.DOMAIN_OWNERSHIP_INFERENCE,
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 200,
      });

      const parsedResponse = JSON.parse(aiResponse.rawText);

      // Create a claim per domain
      for (const domain of parsedResponse.likelyDomains || []) {
        const valueJsonWithMeta = {
          domain,
          confidence: parsedResponse.confidence,
          reasoning: parsedResponse.reasoning,
          _meta: {
            moduleRunId,
            aiProvider: aiResponse.provider,
            aiModel: aiResponse.model,
            tokensUsed: aiResponse.tokensUsed || 0,
          },
        };

        const claim = await this.writeGroupedClaim(
          projectId,
          personId,
          CLAIM_KEY.DIGITAL_DOMAIN_OWNERSHIP,
          `domain:${domain}`,
          valueJsonWithMeta,
          0.5,
          observedAt,
          sourceDocumentId,
          moduleRunId,
        );

        if (claim) {
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `LinkedinDigitalIdentityEnricherService.inferDomainOwnership: Created claim [claimId=${claim.ClaimID}, domain=${domain}]`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.inferDomainOwnership: Error [error=${error.message}, stack=${error.stack}]`,
      );
    }
  }

  // TODO: Username patterns across platforms (Twitter, GitHub, etc.)
  // This would require social profile scraping or API integrations

  /**
   * Write or version a single-value claim
   */
  private async writeSingleValueClaim(
    projectId: number,
    personId: number,
    claimType: string,
    groupKey: string,
    valueJson: any,
    confidence: number,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
  ): Promise<Claim | null> {
    try {
      const existingClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              ClaimType: claimType,
              GroupKey: groupKey,
              SupersededAt: null,
            },
            order: { CreatedAt: 'DESC' },
            take: 1,
          },
          false,
        ),
      );

      if (existingClaims.length > 0) {
        const existing = existingClaims[0];
        if (this.deepEqual(existing.ValueJson, valueJson)) {
          this.logger.info(
            `LinkedinDigitalIdentityEnricherService.writeSingleValueClaim: Claim unchanged, skipping [claimType=${claimType}]`,
          );
          return null;
        }

        await Promisify(
          this.claimRepoService.update({ ClaimID: existing.ClaimID }, {
            SupersededAt: new Date(),
          } as any),
        );
      }

      const newClaim = await Promisify<Claim>(
        this.claimRepoService.create({
          ProjectID: projectId,
          PersonID: personId,
          ClaimType: claimType,
          GroupKey: groupKey,
          ValueJson: valueJson,
          Confidence: confidence,
          ObservedAt: observedAt,
          SourceDocumentID: sourceDocumentId,
          ModuleRunID: moduleRunId,
          SchemaVersion: 'v1',
          ValidFrom: null,
          ValidTo: null,
          SupersededAt: null,
          ReplacedByClaimID: null,
        }),
      );

      if (existingClaims.length > 0) {
        await Promisify(
          this.claimRepoService.update({ ClaimID: existingClaims[0].ClaimID }, {
            ReplacedByClaimID: newClaim.ClaimID,
          } as any),
        );
      }

      return newClaim;
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.writeSingleValueClaim: Error [error=${error.message}, claimType=${claimType}]`,
      );
      throw error;
    }
  }

  /**
   * Write or version a grouped claim
   */
  private async writeGroupedClaim(
    projectId: number,
    personId: number,
    claimType: string,
    groupKey: string,
    valueJson: any,
    confidence: number,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
  ): Promise<Claim | null> {
    try {
      const existingClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              ClaimType: claimType,
              GroupKey: groupKey,
              SupersededAt: null,
            },
            order: { CreatedAt: 'DESC' },
            take: 1,
          },
          false,
        ),
      );

      if (existingClaims.length > 0) {
        const existing = existingClaims[0];
        if (this.deepEqual(existing.ValueJson, valueJson)) {
          this.logger.info(
            `LinkedinDigitalIdentityEnricherService.writeGroupedClaim: Claim unchanged, skipping [claimType=${claimType}, groupKey=${groupKey}]`,
          );
          return null;
        }

        await Promisify(
          this.claimRepoService.update({ ClaimID: existing.ClaimID }, {
            SupersededAt: new Date(),
          } as any),
        );
      }

      const newClaim = await Promisify<Claim>(
        this.claimRepoService.create({
          ProjectID: projectId,
          PersonID: personId,
          ClaimType: claimType,
          GroupKey: groupKey,
          ValueJson: valueJson,
          Confidence: confidence,
          ObservedAt: observedAt,
          SourceDocumentID: sourceDocumentId,
          ModuleRunID: moduleRunId,
          SchemaVersion: 'v1',
          ValidFrom: null,
          ValidTo: null,
          SupersededAt: null,
          ReplacedByClaimID: null,
        }),
      );

      if (existingClaims.length > 0) {
        await Promisify(
          this.claimRepoService.update({ ClaimID: existingClaims[0].ClaimID }, {
            ReplacedByClaimID: newClaim.ClaimID,
          } as any),
        );
      }

      return newClaim;
    } catch (error) {
      this.logger.error(
        `LinkedinDigitalIdentityEnricherService.writeGroupedClaim: Error [error=${error.message}, claimType=${claimType}]`,
      );
      throw error;
    }
  }

  private deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}

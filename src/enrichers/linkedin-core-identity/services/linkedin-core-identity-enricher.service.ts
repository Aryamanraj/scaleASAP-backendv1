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
import { ResultWithError, ClaimData } from '../../../common/interfaces';
import { DocumentSource } from '../../../common/types/claim-types';
import { DocumentKind } from '../../../common/types/document.types';
import { CLAIM_KEY } from '../../../common/types/claim-types';
import { AI_PROVIDER, AI_MODEL, AI_TASK } from '../../../common/types/ai.types';
import { CONFIDENCE_LEVEL } from '../../../common/types/confidence.types';
import {
  COUNTRY_CODE_TO_TIMEZONE,
  BOARD_POSITION_KEYWORDS,
} from '../../../common/constants/timezone.constants';
import {
  LinkedinBasicInfo,
  LinkedinLocation,
  LinkedinEducationItem,
  LinkedinExperienceItem,
  LinkedinCertificationItem,
} from '../../../common/interfaces/linkedin.interfaces';
import { buildAgeRangePrompt } from '../../../ai/prompts/age-range.prompt';

@Injectable()
export class LinkedinCoreIdentityEnricherService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private documentsService: DocumentsService,
    private claimRepoService: ClaimRepoService,
    private aiService: AIService,
  ) {}

  async enrich(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinCoreIdentityEnricherService.enrich: Starting enrichment [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
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
          `No valid LinkedIn profile document found for projectId=${run.ProjectID}, personId=${run.PersonID}. Please run 'linkedin-profile-connector' first to ingest profile data before running this enricher.`,
        );
      }

      this.logger.info(
        `LinkedinCoreIdentityEnricherService.enrich: Found document [documentId=${document.DocumentID}, capturedAt=${document.CapturedAt}]`,
      );

      // Normalize payload
      const rawPayload = document.PayloadJson;
      const root = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
      const basic: LinkedinBasicInfo | null =
        root?.basic_info ?? root?.basicInfo ?? root?.basic ?? null;

      // Extract sections
      const name = this.getName(root, basic);
      const location = this.getLocation(root, basic);
      const educationList = this.getEducationList(root);
      const experienceList = this.getExperienceList(root);
      const certificationsList = this.getCertificationsList(root);

      this.logger.info(
        `LinkedinCoreIdentityEnricherService.enrich: Parsed linkedin sections [hasBasic=${!!basic}, hasName=${!!name}, hasLocation=${!!location}, educationCount=${
          educationList.length
        }, experienceCount=${experienceList.length}, certCount=${
          certificationsList.length
        }]`,
      );

      const claimsCreated: number[] = [];

      // 1. Legal name (single-value claim)
      if (name) {
        const claim = await this.writeSingleValueClaim(
          run.ProjectID,
          run.PersonID,
          CLAIM_KEY.CORE_LEGAL_NAME,
          {
            value: name.fullName,
            firstName: name.firstName || null,
            lastName: name.lastName || null,
          },
          0.9,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          'v1',
          'basic_info.fullname',
        );
        if (claim) {
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.enrich: Created legal name claim [claimId=${claim.ClaimID}]`,
          );
        }
      }

      // 2. Location (single-value claim)
      if (location) {
        const locationValue = {
          full: location.full || null,
          city: location.city || null,
          country: location.country || null,
          countryCode: location.countryCode || null,
          timezone:
            location.countryCode &&
            COUNTRY_CODE_TO_TIMEZONE[location.countryCode]
              ? COUNTRY_CODE_TO_TIMEZONE[location.countryCode]
              : null,
        };
        const claim = await this.writeSingleValueClaim(
          run.ProjectID,
          run.PersonID,
          CLAIM_KEY.CORE_LOCATION,
          locationValue,
          0.85,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          'v1',
          'basic_info.location',
        );
        if (claim) {
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.enrich: Created location claim [claimId=${claim.ClaimID}]`,
          );
        }
      }

      // 3. Education items (grouped claims)
      for (const edu of educationList) {
        const eduValue = this.normalizeEducation(edu);
        const claim = await this.writeGroupedClaim(
          run.ProjectID,
          run.PersonID,
          CLAIM_KEY.CORE_EDUCATION_ITEM,
          eduValue.fingerprint,
          eduValue,
          0.9,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          'v1',
          'education',
        );
        if (claim) {
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.enrich: Created education claim [claimId=${claim.ClaimID}, school=${eduValue.school}]`,
          );
        }
      }

      // 4. Career roles (grouped claims with duration)
      for (const exp of experienceList) {
        const roleValue = this.normalizeCareerRole(exp);
        const claim = await this.writeGroupedClaim(
          run.ProjectID,
          run.PersonID,
          CLAIM_KEY.CORE_CAREER_ROLE,
          roleValue.fingerprint,
          roleValue,
          0.9,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          'v1',
          'experience',
        );
        if (claim) {
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.enrich: Created career role claim [claimId=${claim.ClaimID}, company=${roleValue.company}, durationMonths=${roleValue.durationMonths}]`,
          );
        }
      }

      // 5. Certifications (grouped claims)
      for (const cert of certificationsList) {
        const certValue = this.normalizeCertification(cert);
        const claim = await this.writeGroupedClaim(
          run.ProjectID,
          run.PersonID,
          CLAIM_KEY.CORE_CERTIFICATION,
          certValue.fingerprint,
          certValue,
          0.9,
          document.CapturedAt,
          document.DocumentID,
          run.ModuleRunID,
          'v1',
          'certifications',
        );
        if (claim) {
          claimsCreated.push(claim.ClaimID);
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.enrich: Created certification claim [claimId=${claim.ClaimID}, name=${certValue.name}]`,
          );
        }
      }

      // 6. Board positions (deterministic only)
      for (const exp of experienceList) {
        if (this.isBoardPosition(exp.title || '')) {
          const roleValue = this.normalizeCareerRole(exp);
          const boardValue = {
            company: roleValue.company,
            title: roleValue.title,
            startDate: roleValue.startDate,
            endDate: roleValue.endDate,
            evidenceRoleFingerprint: roleValue.fingerprint,
          };
          const claim = await this.writeGroupedClaim(
            run.ProjectID,
            run.PersonID,
            CLAIM_KEY.CORE_BOARD_POSITION,
            roleValue.fingerprint,
            boardValue,
            0.9,
            document.CapturedAt,
            document.DocumentID,
            run.ModuleRunID,
            'v1',
            'experience.board',
          );
          if (claim) {
            claimsCreated.push(claim.ClaimID);
            this.logger.info(
              `LinkedinCoreIdentityEnricherService.enrich: Created board position claim [claimId=${claim.ClaimID}, title=${boardValue.title}]`,
            );
          }
        }
      }
      // 7. Age Range (AI inference from deterministic claims)
      await this.inferAgeRange(
        run.ProjectID,
        run.PersonID,
        document.CapturedAt,
        document.DocumentID,
        run.ModuleRunID,
        claimsCreated,
      );

      this.logger.info(
        `LinkedinCoreIdentityEnricherService.enrich: Completed enrichment [moduleRunId=${run.ModuleRunID}, claimsCreated=${claimsCreated.length}]`,
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
        `LinkedinCoreIdentityEnricherService.enrich: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }

  private getName(
    root: any,
    basic: LinkedinBasicInfo | null,
  ): { fullName: string; firstName?: string; lastName?: string } | null {
    const fullName =
      basic?.fullname ||
      basic?.fullName ||
      basic?.full_name ||
      root?.fullName ||
      root?.full_name ||
      (root?.firstName && root?.lastName
        ? `${root.firstName} ${root.lastName}`
        : null) ||
      root?.name ||
      root?.profile?.fullName ||
      root?.profile?.name ||
      null;

    if (fullName) {
      return {
        fullName,
        firstName:
          basic?.first_name || basic?.firstName || root?.firstName || undefined,
        lastName:
          basic?.last_name || basic?.lastName || root?.lastName || undefined,
      };
    }

    // Try combining first + last
    const firstName = basic?.first_name || basic?.firstName;
    const lastName = basic?.last_name || basic?.lastName;
    if (firstName && lastName) {
      return { fullName: `${firstName} ${lastName}`, firstName, lastName };
    }

    if (root?.firstName && root?.lastName) {
      return {
        fullName: `${root.firstName} ${root.lastName}`,
        firstName: root.firstName,
        lastName: root.lastName,
      };
    }

    return null;
  }

  private getLocation(
    root: any,
    basic: LinkedinBasicInfo | null,
  ): {
    full?: string;
    city?: string;
    country?: string;
    countryCode?: string;
  } | null {
    const locObj: LinkedinLocation | string | null =
      basic?.location ||
      root?.location ||
      root?.geo?.full ||
      root?.profile?.location ||
      null;

    if (!locObj) return null;

    if (typeof locObj === 'string') {
      // Parse "City, Country" format
      const parts = locObj.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        return {
          full: locObj,
          city: parts[0],
          country: parts[parts.length - 1],
        };
      }
      return { full: locObj };
    }

    return {
      full: locObj.full || null,
      city: locObj.city || null,
      country: locObj.country || null,
      countryCode: locObj.country_code || locObj.countryCode || null,
    };
  }

  private getEducationList(root: any): LinkedinEducationItem[] {
    const educations =
      root?.education ||
      root?.educations ||
      root?.profile?.educations ||
      root?.profile?.education ||
      root?.education_section ||
      [];
    return Array.isArray(educations) ? educations : [];
  }

  private getExperienceList(root: any): LinkedinExperienceItem[] {
    const experiences =
      root?.experience ||
      root?.positions ||
      root?.profile?.positions ||
      root?.profile?.experience ||
      root?.experience_section ||
      [];
    return Array.isArray(experiences) ? experiences : [];
  }

  private getCertificationsList(root: any): LinkedinCertificationItem[] {
    const certifications =
      root?.certifications ||
      root?.licensesAndCertifications ||
      root?.profile?.certifications ||
      [];
    return Array.isArray(certifications) ? certifications : [];
  }

  private normalizeEducation(edu: LinkedinEducationItem): any {
    const school = edu?.schoolName || edu?.school || edu?.institution || '';
    const degree = edu?.degreeName || edu?.degree || '';
    const field = edu?.fieldOfStudy || edu?.field || '';
    const startYear =
      edu?.dateRange?.start?.year ||
      edu?.startYear ||
      this.extractYearFromDateString((edu as any)?.startDate) ||
      null;
    const endYear =
      edu?.dateRange?.end?.year ||
      edu?.endYear ||
      this.extractYearFromDateString((edu as any)?.endDate) ||
      null;
    const description = edu?.description || '';

    const fingerprint = `${school}|${degree}|${field}|${startYear ?? ''}|${
      endYear ?? ''
    }`;

    return {
      school,
      degree,
      field,
      startYear,
      endYear,
      description,
      fingerprint,
    };
  }

  private normalizeCareerRole(exp: LinkedinExperienceItem): any {
    const company = exp?.companyName || exp?.company || '';
    const title = exp?.title || '';
    const location = exp?.location || '';
    const startDate = this.normalizeDate(
      exp?.dateRange?.start || exp?.startDate,
    );
    const endDate = this.normalizeDate(exp?.dateRange?.end || exp?.endDate);
    const isCurrent = !endDate || exp?.isCurrent || false;
    const description = exp?.description || '';

    // Calculate duration in months
    const durationMonths = this.calculateDurationMonths(
      startDate,
      endDate || null,
    );

    const fingerprint = `${company}|${title}|${startDate ?? ''}|${
      endDate || 'present'
    }`;

    return {
      company,
      title,
      location,
      startDate,
      endDate: endDate || null,
      isCurrent,
      durationMonths,
      description,
      fingerprint,
    };
  }

  private normalizeCertification(cert: LinkedinCertificationItem): any {
    const name = cert?.name || cert?.certificationName || '';
    const issuer = cert?.authority || cert?.issuer || '';
    const issueDate = this.normalizeDate(cert?.dateRange?.start || cert?.date);
    const expirationDate = this.normalizeDate(cert?.dateRange?.end);
    const credentialId = cert?.licenseNumber || cert?.credentialId || '';
    const url = cert?.url || '';

    const fingerprint = `${name}|${issuer}|${issueDate ?? ''}|${credentialId}`;

    return {
      name,
      issuer,
      issueDate: issueDate || null,
      expirationDate: expirationDate || null,
      credentialId,
      url,
      fingerprint,
    };
  }

  private normalizeDate(dateObj: any): string | null {
    if (!dateObj) return null;
    if (typeof dateObj === 'string') return dateObj;
    if (dateObj.year && dateObj.month) {
      return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-01`;
    }
    if (dateObj.year) {
      return `${dateObj.year}-01-01`;
    }
    return null;
  }

  private extractYearFromDateString(
    dateStr: string | null | undefined,
  ): number | null {
    if (!dateStr) return null;
    const match = String(dateStr).match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
  }

  private calculateDurationMonths(
    startDate: string | null,
    endDate: string | null,
  ): number | null {
    if (!startDate) return null;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();

    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();

    return yearsDiff * 12 + monthsDiff;
  }

  private isBoardPosition(title: string): boolean {
    const lowerTitle = title.toLowerCase();
    return BOARD_POSITION_KEYWORDS.some((keyword) =>
      lowerTitle.includes(keyword),
    );
  }

  private async writeSingleValueClaim(
    projectId: number,
    personId: number,
    claimType: string,
    valueJson: any,
    confidence: number,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
    schemaVersion: string,
    pathUsed: string,
  ): Promise<Claim | null> {
    try {
      // Find latest claim with same type and GroupKey='single'
      const existingClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              ClaimType: claimType,
              GroupKey: 'single',
              SupersededAt: null,
            },
            order: { CreatedAt: 'DESC' },
            take: 1,
          },
          false, // panic=false
        ),
      );

      // Check if value is identical
      if (existingClaims.length > 0) {
        const existing = existingClaims[0];
        if (this.deepEqual(existing.ValueJson, valueJson)) {
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.writeSingleValueClaim: Claim unchanged, skipping [claimType=${claimType}]`,
          );
          return null;
        }

        // Supersede existing claim
        await Promisify(
          this.claimRepoService.update({ ClaimID: existing.ClaimID }, {
            SupersededAt: new Date(),
          } as any),
        );

        this.logger.info(
          `LinkedinCoreIdentityEnricherService.writeSingleValueClaim: Superseded previous claim [claimId=${existing.ClaimID}]`,
        );
      }

      // Create new claim
      const newClaim = await Promisify<Claim>(
        this.claimRepoService.create({
          ProjectID: projectId,
          PersonID: personId,
          ClaimType: claimType,
          GroupKey: 'single',
          ValueJson: valueJson,
          Confidence: confidence,
          ObservedAt: observedAt,
          SourceDocumentID: sourceDocumentId,
          ModuleRunID: moduleRunId,
          SchemaVersion: schemaVersion,
          ValidFrom: null,
          ValidTo: null,
          SupersededAt: null,
          ReplacedByClaimID: null,
        }),
      );

      // Update previous claim's ReplacedByClaimID if superseded
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
        `LinkedinCoreIdentityEnricherService.writeSingleValueClaim: Error [error=${error.message}, claimType=${claimType}]`,
      );
      throw error;
    }
  }

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
    schemaVersion: string,
    pathUsed: string,
  ): Promise<Claim | null> {
    try {
      // Find latest claim with same type and groupKey
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
          false, // panic=false
        ),
      );

      // Check if value is identical
      if (existingClaims.length > 0) {
        const existing = existingClaims[0];
        if (this.deepEqual(existing.ValueJson, valueJson)) {
          this.logger.info(
            `LinkedinCoreIdentityEnricherService.writeGroupedClaim: Claim unchanged, skipping [claimType=${claimType}, groupKey=${groupKey}]`,
          );
          return null;
        }

        // Supersede existing claim
        await Promisify(
          this.claimRepoService.update({ ClaimID: existing.ClaimID }, {
            SupersededAt: new Date(),
          } as any),
        );

        this.logger.info(
          `LinkedinCoreIdentityEnricherService.writeGroupedClaim: Superseded previous claim [claimId=${existing.ClaimID}]`,
        );
      }

      // Create new claim
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
          SchemaVersion: schemaVersion,
          ValidFrom: null,
          ValidTo: null,
          SupersededAt: null,
          ReplacedByClaimID: null,
        }),
      );

      // Update previous claim's ReplacedByClaimID if superseded
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
        `LinkedinCoreIdentityEnricherService.writeGroupedClaim: Error [error=${error.message}, claimType=${claimType}]`,
      );
      throw error;
    }
  }

  private deepEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Infer age range using AI based on education and career claims
   */
  private async inferAgeRange(
    projectId: number,
    personId: number,
    observedAt: Date,
    sourceDocumentId: number,
    moduleRunId: number,
    claimsCreated: number[],
  ): Promise<void> {
    try {
      // Fetch education claims
      const educationClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              ClaimType: CLAIM_KEY.CORE_EDUCATION_ITEM,
              SupersededAt: null,
            },
          },
          false, // panic=false
        ),
      );

      // Fetch career claims
      const careerClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
              ClaimType: CLAIM_KEY.CORE_CAREER_ROLE,
              SupersededAt: null,
            },
          },
          false, // panic=false
        ),
      );

      // Skip only if no claims exist at all
      if (educationClaims.length === 0 && careerClaims.length === 0) {
        this.logger.info(
          `LinkedinCoreIdentityEnricherService.inferAgeRange: Skipping age range inference due to zero evidence [projectId=${projectId}, personId=${personId}]`,
        );
        return;
      }

      this.logger.info(
        `LinkedinCoreIdentityEnricherService.inferAgeRange: Age range inference proceeding [projectId=${projectId}, personId=${personId}, educationCount=${educationClaims.length}, careerCount=${careerClaims.length}]`,
      );

      // Build rich evidence bundle (include ALL claims, even without dates)
      const educationEvidence = educationClaims.map((claim) => ({
        school: claim.ValueJson?.school || 'Unknown',
        degree: claim.ValueJson?.degree || '',
        field: claim.ValueJson?.field || '',
        endYear: claim.ValueJson?.endYear || null,
      }));

      const careerEvidence = careerClaims.map((claim) => ({
        title: claim.ValueJson?.title || 'Unknown',
        company: claim.ValueJson?.company || 'Unknown',
        startYear: claim.ValueJson?.startDate
          ? new Date(claim.ValueJson.startDate).getFullYear()
          : null,
        isCurrent: claim.ValueJson?.isCurrent || false,
      }));

      // Build prompts with rich evidence bundle
      const currentYear = new Date().getFullYear();
      const { systemPrompt, userPrompt } = buildAgeRangePrompt({
        education: educationEvidence,
        career: careerEvidence,
        profileMeta: {
          linkedinProfileCapturedYear: observedAt?.getFullYear() || null,
        },
        currentYear,
      });

      // Call AI service
      const aiResponse = await this.aiService.run({
        provider: AI_PROVIDER.OPENAI,
        model: AI_MODEL.GPT_4O,
        taskType: AI_TASK.AGE_RANGE_ESTIMATION,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 300,
      });

      // Parse response
      let parsedResponse: {
        minAge: number | null;
        maxAge: number | null;
        confidence: string;
        evidence: string[];
        notes: string;
      };

      try {
        parsedResponse = JSON.parse(aiResponse.rawText);
      } catch (parseError) {
        this.logger.warn(
          `LinkedinCoreIdentityEnricherService.inferAgeRange: Failed to parse AI response [error=${parseError.message}, rawText=${aiResponse.rawText}]`,
        );
        return;
      }

      // Validate response
      if (
        parsedResponse.minAge !== null &&
        parsedResponse.maxAge !== null &&
        parsedResponse.minAge > parsedResponse.maxAge
      ) {
        this.logger.warn(
          `LinkedinCoreIdentityEnricherService.inferAgeRange: Invalid age range [minAge=${parsedResponse.minAge}, maxAge=${parsedResponse.maxAge}]`,
        );
        return;
      }

      if (
        parsedResponse.minAge !== null &&
        parsedResponse.maxAge !== null &&
        parsedResponse.maxAge - parsedResponse.minAge > 12
      ) {
        this.logger.warn(
          `LinkedinCoreIdentityEnricherService.inferAgeRange: Age range too wide [minAge=${
            parsedResponse.minAge
          }, maxAge=${parsedResponse.maxAge}, width=${
            parsedResponse.maxAge - parsedResponse.minAge
          }]`,
        );
        return;
      }

      if (
        !Object.values(CONFIDENCE_LEVEL).includes(
          parsedResponse.confidence as CONFIDENCE_LEVEL,
        )
      ) {
        this.logger.warn(
          `LinkedinCoreIdentityEnricherService.inferAgeRange: Invalid confidence level [confidence=${parsedResponse.confidence}]`,
        );
        return;
      }

      // Build complete ValueJson with AI metadata embedded
      const valueJsonWithMeta = {
        minAge: parsedResponse.minAge,
        maxAge: parsedResponse.maxAge,
        confidence: parsedResponse.confidence,
        evidence: parsedResponse.evidence,
        notes: parsedResponse.notes,
        _meta: {
          moduleRunId,
          derivedFromClaimIds: [
            ...educationClaims.map((c) => c.ClaimID),
            ...careerClaims.map((c) => c.ClaimID),
          ],
          aiProvider: aiResponse.provider,
          aiModel: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed || 0,
        },
      };

      // Write claim with embedded metadata
      const claim = await this.writeSingleValueClaim(
        projectId,
        personId,
        CLAIM_KEY.CORE_AGE_RANGE,
        valueJsonWithMeta,
        0.7, // Lower confidence for AI-inferred claims
        observedAt,
        sourceDocumentId,
        moduleRunId,
        'v1',
        'ai_inference',
      );

      if (claim) {
        claimsCreated.push(claim.ClaimID);
        this.logger.info(
          `LinkedinCoreIdentityEnricherService.inferAgeRange: Age range inferred [claimId=${claim.ClaimID}, minAge=${parsedResponse.minAge}, maxAge=${parsedResponse.maxAge}, confidence=${parsedResponse.confidence}]`,
        );
      }
    } catch (error) {
      // Log error but don't fail the entire enrichment
      this.logger.error(
        `LinkedinCoreIdentityEnricherService.inferAgeRange: Error during age range inference [error=${error.message}, stack=${error.stack}]`,
      );
      // Continue without failing the module
    }
  }
}

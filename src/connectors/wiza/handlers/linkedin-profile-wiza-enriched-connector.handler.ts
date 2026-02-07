import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ModuleRun } from '../../../repo/entities/module-run.entity';
import { ScraperService } from '../../../scraper/scraper.service';
import { Promisify } from '../../../common/helpers/promisifier';
import { ResultWithError } from '../../../common/interfaces';
import { SCRAPER_PROVIDER } from '../../../common/types/scraper.types';
import {
  SearchItem,
  SearchResponse,
  EnrichedProfile,
  ProfilePositionGroup,
  ProfileEducation,
  ProfileLanguagesBlock,
} from '../../../common/interfaces/scraper.interfaces';
import {
  ProfileData,
  ExperienceItem,
  EducationItem,
  SkillItem,
  CertificationItem,
  LanguageItem,
  RecentPost,
} from '../../../common/interfaces/linkedin-scraper.interfaces';
import {
  safeNormalizeLinkedinUrl,
  extractLinkedinUsername,
} from '../../../common/helpers/linkedinUrl';
import { DocumentRepoService } from '../../../repo/document-repo.service';
import { sha256Hex } from '../../../common/helpers/sha256';
import {
  DocumentSource,
  DocumentKind,
} from '../../../common/types/document.types';
import { LINKEDIN_DOCUMENT_TYPE } from '../../../common/constants/linkedin.constants';
import { Document } from '../../../repo/entities/document.entity';

@Injectable()
export class LinkedinProfileWizaEnrichedConnectorHandler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private scraperService: ScraperService,
    private documentRepoService: DocumentRepoService,
  ) {}

  async execute(run: ModuleRun): Promise<ResultWithError> {
    try {
      this.logger.info(
        `LinkedinProfileWizaEnrichedConnectorHandler.execute: Processing module run [moduleRunId=${run.ModuleRunID}, projectId=${run.ProjectID}, personId=${run.PersonID}]`,
      );

      if (!run?.InputConfigJson) {
        throw new Error(
          'Missing InputConfigJson for linkedin-profile-wiza-enriched-connector',
        );
      }

      const profileUrl: string | undefined = run.InputConfigJson?.profileUrl;
      if (!profileUrl) {
        throw new Error('Missing profileUrl in InputConfigJson');
      }

      const normalizedUrl = safeNormalizeLinkedinUrl(profileUrl) || profileUrl;
      let linkedinSlug: string | null = null;
      try {
        linkedinSlug = extractLinkedinUsername(profileUrl);
      } catch {
        linkedinSlug = null;
      }

      const searchPayload: Record<string, unknown> = {
        query: {
          ...(linkedinSlug ? { linkedin_slug: [linkedinSlug] } : {}),
          ...(normalizedUrl ? { linkedin_url: [normalizedUrl] } : {}),
        },
        page_size: 5,
      };

      const searchResult = await Promisify<SearchResponse<SearchItem>>(
        this.scraperService.search<SearchItem>({
          provider: SCRAPER_PROVIDER.PROSPECT,
          payload: searchPayload,
          options: {
            maxPages: 1,
            maxItems: 5,
            pageSizeOverride: 5,
            enrichProfiles: true,
          },
        }),
      );

      const items = searchResult?.items || [];
      if (!items.length) {
        throw new Error(`Wiza search returned no results for ${profileUrl}`);
      }

      const matched = this.pickBestMatch(items, normalizedUrl);
      if (!matched) {
        throw new Error(`No matching Wiza profile found for ${profileUrl}`);
      }

      const profileData = this.mapToLinkedinProfile(matched, normalizedUrl);

      const contentString = JSON.stringify(profileData);
      const hash = sha256Hex(contentString);
      const sourceRef =
        profileData.profileUrn || profileData.profileUrl || profileUrl;

      const document = await Promisify<Document>(
        this.documentRepoService.create({
          ProjectID: run.ProjectID,
          PersonID: run.PersonID,
          Source: DocumentSource.LINKEDIN,
          SourceRef: sourceRef,
          ContentType: LINKEDIN_DOCUMENT_TYPE.PROFILE,
          DocumentKind: DocumentKind.LINKEDIN_PROFILE,
          IsValid: true,
          StorageUri: 'inline://wiza-scraper',
          Hash: hash,
          CapturedAt: new Date(),
          ModuleRunID: run.ModuleRunID,
          PayloadJson: profileData,
          InvalidatedMetaJson: null,
        }),
      );

      this.logger.info(
        `LinkedinProfileWizaEnrichedConnectorHandler.execute: Created profile document [documentId=${document.DocumentID}]`,
      );

      return {
        error: null,
        data: {
          documentId: document.DocumentID,
          profileUrl: profileData.profileUrl,
        },
      };
    } catch (error) {
      this.logger.error(
        `LinkedinProfileWizaEnrichedConnectorHandler.execute: Error [error=${error.message}, moduleRunId=${run.ModuleRunID}, stack=${error.stack}]`,
      );
      return { error: error, data: null };
    }
  }

  private pickBestMatch(
    items: SearchItem[],
    normalizedTarget: string,
  ): SearchItem | null {
    if (!items.length) return null;
    const target = safeNormalizeLinkedinUrl(normalizedTarget || '') || null;
    if (!target) {
      return items[0];
    }

    const exact = items.find((item) => {
      const itemUrl = safeNormalizeLinkedinUrl(item.linkedin_url);
      return itemUrl === target;
    });

    return exact || items[0];
  }

  private mapToLinkedinProfile(
    item: SearchItem,
    normalizedUrl: string,
  ): ProfileData {
    const enrichedProfile = item.enriched?.profile as
      | EnrichedProfile
      | undefined;
    const now = new Date().toISOString();

    const nameParts = item.full_name?.split(' ') || [];
    const firstName = enrichedProfile?.first_name || nameParts[0] || undefined;
    const lastName =
      enrichedProfile?.last_name || nameParts.slice(1).join(' ') || undefined;
    const fullName =
      item.full_name || [firstName, lastName].filter(Boolean).join(' ');

    const profileUrl =
      safeNormalizeLinkedinUrl(normalizedUrl) ||
      safeNormalizeLinkedinUrl(item.linkedin_url) ||
      `https://linkedin.com/in/${item.linkedin_slug}`;

    const experience = this.mapExperience(
      enrichedProfile?.position_groups || [],
    );
    const education = this.mapEducation(enrichedProfile?.education || []);
    const skills = this.mapSkills(enrichedProfile?.skills || []);
    const certifications = this.mapCertifications(
      enrichedProfile?.certifications || [],
    );
    const languages = this.mapLanguages(enrichedProfile?.languages || null);

    const profileData: ProfileData = {
      profileUrl,
      profileUrn: enrichedProfile?.entity_urn || item.linkedin_id || undefined,
      scrapedAt: now,
      firstName,
      lastName,
      fullName,
      headline: item.job_title || enrichedProfile?.sub_title || undefined,
      publicIdentifier: item.linkedin_slug || undefined,
      about: enrichedProfile?.summary || undefined,
      profileImage: enrichedProfile?.profile_picture || undefined,
      location:
        enrichedProfile?.location?.default || item.location_name || undefined,
      connections: undefined,
      experience,
      education,
      skills,
      certifications,
      languages,
      projects: [],
      publications: [],
      honors: [],
      volunteer: [],
      recentPosts: [] as RecentPost[],
      recentReposts: [] as RecentPost[],
    };

    return profileData;
  }

  private mapExperience(groups: ProfilePositionGroup[]): ExperienceItem[] {
    const items: ExperienceItem[] = [];
    for (const group of groups) {
      for (const position of group.profile_positions || []) {
        items.push({
          title: position.title || undefined,
          company: position.company || group.company?.name || undefined,
          employmentType: position.employment_type || undefined,
          location: position.location || undefined,
          description: position.description || undefined,
          startDate: this.formatDate(position.date?.start),
          endDate: this.formatDate(position.date?.end),
        });
      }
    }
    return items;
  }

  private mapEducation(educationList: ProfileEducation[]): EducationItem[] {
    return educationList.map((education) => ({
      school: education.school?.name || undefined,
      schoolUrl: education.school?.url || undefined,
      degree: education.degree_name || undefined,
      fieldOfStudy: education.field_of_study || undefined,
      startDate: this.formatDate(education.date?.start),
      endDate: this.formatDate(education.date?.end),
      description: education.description || undefined,
    }));
  }

  private mapSkills(skills: Array<string | null | undefined>): SkillItem[] {
    return skills
      .filter(
        (skill): skill is string =>
          typeof skill === 'string' && skill.length > 0,
      )
      .map((skill) => ({ name: skill }));
  }

  private mapCertifications(certifications: unknown[]): CertificationItem[] {
    return certifications
      .map((cert) => {
        if (typeof cert === 'string') {
          return { name: cert } as CertificationItem;
        }
        if (cert && typeof cert === 'object') {
          const record = cert as Record<string, unknown>;
          return {
            name: typeof record.name === 'string' ? record.name : undefined,
            issuer:
              typeof record.issuer === 'string' ? record.issuer : undefined,
            issueDate:
              typeof record.issueDate === 'string'
                ? record.issueDate
                : undefined,
            expirationDate:
              typeof record.expirationDate === 'string'
                ? record.expirationDate
                : undefined,
            credentialId:
              typeof record.credentialId === 'string'
                ? record.credentialId
                : undefined,
            credentialUrl:
              typeof record.credentialUrl === 'string'
                ? record.credentialUrl
                : undefined,
          } as CertificationItem;
        }
        return null;
      })
      .filter((item): item is CertificationItem => Boolean(item));
  }

  private mapLanguages(
    languages: ProfileLanguagesBlock | null,
  ): LanguageItem[] {
    const list = languages?.profile_languages || [];
    return list
      .filter((lang) => lang?.name)
      .map((lang) => ({
        name: lang.name,
        proficiency: lang.proficiency || undefined,
      }));
  }

  private formatDate(date?: {
    day: number | null;
    month: number | null;
    year: number | null;
  }): string | undefined {
    if (!date || !date.year) {
      return undefined;
    }
    const month = date.month ? String(date.month).padStart(2, '0') : null;
    if (month) {
      return `${date.year}-${month}`;
    }
    return `${date.year}`;
  }
}

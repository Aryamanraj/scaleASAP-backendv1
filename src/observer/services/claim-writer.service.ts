import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ClaimRepoService } from '../../repo/claim-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { Claim } from '../../repo/entities/claim.entity';
import { ResultWithError, InsertClaimParams } from '../../common/interfaces';
import { IsNull } from 'typeorm';

@Injectable()
export class ClaimWriterService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private claimRepoService: ClaimRepoService,
  ) {}

  async insertClaimAndSupersedePrevious(
    params: InsertClaimParams,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ClaimWriterService.insertClaimAndSupersedePrevious: Starting`,
        {
          projectId: params.ProjectID,
          personId: params.PersonID,
          claimType: params.ClaimType,
        },
      );

      // Step 1: Create new claim
      const newClaim = await Promisify<Claim>(
        this.claimRepoService.create({
          ProjectID: params.ProjectID,
          PersonID: params.PersonID,
          ClaimType: params.ClaimType,
          GroupKey: params.GroupKey,
          ValueJson: params.ValueJson,
          Confidence: params.Confidence,
          ObservedAt: params.ObservedAt,
          ValidFrom: params.ValidFrom,
          ValidTo: params.ValidTo,
          SourceDocumentID: params.SourceDocumentID,
          ModuleRunID: params.ModuleRunID,
          SchemaVersion: params.SchemaVersion,
          SupersededAt: null,
          ReplacedByClaimID: null,
        }),
      );

      this.logger.info(
        `ClaimWriterService.insertClaimAndSupersedePrevious: New claim created`,
        {
          claimId: newClaim.ClaimID,
        },
      );

      // Step 2: Find previous active claims to supersede
      const whereConditions: any[] = [
        {
          ProjectID: params.ProjectID,
          PersonID: params.PersonID,
          ClaimType: params.ClaimType,
          GroupKey: params.GroupKey,
          SupersededAt: IsNull(),
        },
      ];

      const previousClaims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: whereConditions,
          },
          false,
        ),
      );

      // Filter out the newly created claim
      const claimsToSupersede = previousClaims.filter(
        (c) => c.ClaimID !== newClaim.ClaimID,
      );

      this.logger.info(
        `ClaimWriterService.insertClaimAndSupersedePrevious: Found ${claimsToSupersede.length} claims to supersede`,
      );

      // Step 3: Update previous claims
      if (claimsToSupersede.length > 0) {
        const now = new Date();
        for (const claim of claimsToSupersede) {
          await Promisify(
            this.claimRepoService.update(
              { ClaimID: claim.ClaimID },
              {
                SupersededAt: now,
                ReplacedByClaimID: newClaim.ClaimID,
              },
            ),
          );
          this.logger.info(
            `ClaimWriterService.insertClaimAndSupersedePrevious: Superseded claim ${claim.ClaimID}`,
          );
        }
      }

      this.logger.info(
        `ClaimWriterService.insertClaimAndSupersedePrevious: Successfully completed`,
        {
          claimId: newClaim.ClaimID,
          supersededCount: claimsToSupersede.length,
        },
      );

      return { error: null, data: newClaim };
    } catch (error) {
      this.logger.error(
        `ClaimWriterService.insertClaimAndSupersedePrevious: Error - ${error.message}`,
        {
          params,
        },
      );
      return { error: error, data: null };
    }
  }

  async getActiveClaims(
    projectId: number,
    personId: number,
    claimTypes?: string[],
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `ClaimWriterService.getActiveClaims: Finding active claims`,
        {
          projectId,
          personId,
          claimTypes,
        },
      );

      const whereConditions: any[] = [];

      if (claimTypes && claimTypes.length > 0) {
        for (const claimType of claimTypes) {
          whereConditions.push({
            ProjectID: projectId,
            PersonID: personId,
            ClaimType: claimType,
            SupersededAt: IsNull(),
          });
        }
      } else {
        whereConditions.push({
          ProjectID: projectId,
          PersonID: personId,
          SupersededAt: IsNull(),
        });
      }

      const claims = await Promisify<Claim[]>(
        this.claimRepoService.getAll(
          {
            where: whereConditions,
            order: {
              CreatedAt: 'ASC',
            },
          },
          false,
        ),
      );

      this.logger.info(
        `ClaimWriterService.getActiveClaims: Found ${claims.length} active claims`,
      );

      return { error: null, data: claims };
    } catch (error) {
      this.logger.error(
        `ClaimWriterService.getActiveClaims: Error - ${error.message}`,
        {
          projectId,
          personId,
        },
      );
      return { error: error, data: null };
    }
  }
}

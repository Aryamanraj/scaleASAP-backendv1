import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';
import { EntityStatus } from '../common/constants/entity.constants';
import { PersonRepoService } from '../repo/person-repo.service';
import { PersonProjectRepoService } from '../repo/person-project-repo.service';
import { ProjectRepoService } from '../repo/project-repo.service';
import { UserRepoService } from '../repo/user-repo.service';
import { Promisify } from '../common/helpers/promisifier';
import { normalizeLinkedinUrl } from '../common/helpers/linkedinUrl';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { ListPersonsQueryDto } from './dto/list-persons-query.dto';
import { AttachPersonToProjectDto } from './dto/attach-person-to-project.dto';
import { Person } from '../repo/entities/person.entity';
import { PersonProject } from '../repo/entities/person-project.entity';

@Injectable()
export class PersonService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private personRepoService: PersonRepoService,
    private personProjectRepoService: PersonProjectRepoService,
    private projectRepoService: ProjectRepoService,
    private userRepoService: UserRepoService,
  ) {}

  async createPerson(dto: CreatePersonDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.createPerson called [linkedinUrl=${dto.linkedinUrl}]`,
      );

      // Normalize the LinkedIn URL
      const normalizedUrl = normalizeLinkedinUrl(dto.linkedinUrl);

      // Validate createdByUser exists
      await Promisify(
        this.userRepoService.get(
          { where: { UserID: dto.createdByUserId } },
          true,
        ),
      );

      // Check if person already exists with this LinkedIn URL
      const existingPerson = await Promisify<Person | null>(
        this.personRepoService.get(
          { where: { LinkedinUrl: normalizedUrl } },
          false,
        ),
      );

      if (existingPerson) {
        this.logger.info(
          `PersonService.createPerson - Person already exists [personId=${existingPerson.PersonID}, linkedinUrl=${normalizedUrl}]`,
        );
        return { error: null, data: existingPerson };
      }

      const personData = {
        LinkedinUrl: normalizedUrl,
        PrimaryDisplayName: dto.primaryDisplayName || null,
        Status: dto.status || EntityStatus.ACTIVE,
        CreatedByUserID: dto.createdByUserId,
      };

      const person = await Promisify<Person>(
        this.personRepoService.create(personData),
      );

      this.logger.info(
        `PersonService.createPerson success [personId=${person.PersonID}, linkedinUrl=${normalizedUrl}]`,
      );
      return { error: null, data: person };
    } catch (error) {
      this.logger.error(
        `PersonService.createPerson error [error=${error.message}, linkedinUrl=${dto.linkedinUrl}]`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Get or create a Person by their LinkedIn URL.
   * If a person with the normalized LinkedIn URL exists, returns it.
   * Otherwise, creates a new Person record.
   *
   * @param linkedinUrl - The LinkedIn profile URL
   * @param createdByUserId - The user ID who is creating this person
   * @param primaryDisplayName - Optional display name for the person
   */
  async getOrCreateByLinkedinUrl(
    linkedinUrl: string,
    createdByUserId: number,
    primaryDisplayName?: string,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.getOrCreateByLinkedinUrl called [linkedinUrl=${linkedinUrl}]`,
      );

      // Normalize the LinkedIn URL
      const normalizedUrl = normalizeLinkedinUrl(linkedinUrl);

      // Check if person already exists
      const existingPerson = await Promisify<Person | null>(
        this.personRepoService.get(
          { where: { LinkedinUrl: normalizedUrl } },
          false,
        ),
      );

      if (existingPerson) {
        this.logger.info(
          `PersonService.getOrCreateByLinkedinUrl - Found existing person [personId=${existingPerson.PersonID}, linkedinUrl=${normalizedUrl}]`,
        );
        return { error: null, data: existingPerson };
      }

      // Validate createdByUser exists
      await Promisify(
        this.userRepoService.get({ where: { UserID: createdByUserId } }, true),
      );

      // Create new person
      const personData = {
        LinkedinUrl: normalizedUrl,
        PrimaryDisplayName: primaryDisplayName || null,
        Status: EntityStatus.ACTIVE,
        CreatedByUserID: createdByUserId,
      };

      const person = await Promisify<Person>(
        this.personRepoService.create(personData),
      );

      this.logger.info(
        `PersonService.getOrCreateByLinkedinUrl - Created new person [personId=${person.PersonID}, linkedinUrl=${normalizedUrl}]`,
      );
      return { error: null, data: person };
    } catch (error) {
      this.logger.error(
        `PersonService.getOrCreateByLinkedinUrl error [error=${error.message}, linkedinUrl=${linkedinUrl}]`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Get a Person by their LinkedIn URL.
   *
   * @param linkedinUrl - The LinkedIn profile URL to search for
   */
  async getPersonByLinkedinUrl(linkedinUrl: string): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.getPersonByLinkedinUrl called [linkedinUrl=${linkedinUrl}]`,
      );

      // Normalize the LinkedIn URL
      const normalizedUrl = normalizeLinkedinUrl(linkedinUrl);

      const person = await Promisify<Person>(
        this.personRepoService.get(
          { where: { LinkedinUrl: normalizedUrl } },
          true,
        ),
      );

      this.logger.info(
        `PersonService.getPersonByLinkedinUrl success [personId=${person.PersonID}]`,
      );
      return { error: null, data: person };
    } catch (error) {
      this.logger.error(
        `PersonService.getPersonByLinkedinUrl error [error=${error.message}, linkedinUrl=${linkedinUrl}]`,
      );
      return { error: error, data: null };
    }
  }

  async listPersons(filters: ListPersonsQueryDto): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.listPersons called [filters=${JSON.stringify(filters)}]`,
      );

      const whereConditions: any = {};

      if (filters.status) {
        whereConditions.Status = filters.status;
      }

      if (filters.createdByUserId) {
        whereConditions.CreatedByUserID = filters.createdByUserId;
      }

      const persons = await Promisify<Person[]>(
        this.personRepoService.getAll({ where: whereConditions }),
      );

      this.logger.info(
        `PersonService.listPersons success [count=${persons.length}]`,
      );
      return { error: null, data: persons };
    } catch (error) {
      this.logger.error(
        `PersonService.listPersons error [error=${error.message}]`,
      );
      return { error: error, data: null };
    }
  }

  async getPersonById(personId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.getPersonById called [personId=${personId}]`,
      );

      const person = await Promisify<Person>(
        this.personRepoService.get({ where: { PersonID: personId } }, true),
      );

      this.logger.info(
        `PersonService.getPersonById success [personId=${personId}]`,
      );
      return { error: null, data: person };
    } catch (error) {
      this.logger.error(
        `PersonService.getPersonById error [error=${error.message}, personId=${personId}]`,
      );
      return { error: error, data: null };
    }
  }

  async updatePerson(
    personId: number,
    dto: UpdatePersonDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.updatePerson called [personId=${personId}, dto=${JSON.stringify(
          dto,
        )}]`,
      );

      const updateData: any = {};

      if (dto.primaryDisplayName !== undefined) {
        updateData.PrimaryDisplayName = dto.primaryDisplayName;
      }

      if (dto.status !== undefined) {
        updateData.Status = dto.status;
      }

      await Promisify(
        this.personRepoService.update({ PersonID: personId }, updateData),
      );

      // Fetch updated person
      const person = await Promisify<Person>(
        this.personRepoService.get({ where: { PersonID: personId } }, true),
      );

      this.logger.info(
        `PersonService.updatePerson success [personId=${personId}]`,
      );
      return { error: null, data: person };
    } catch (error) {
      this.logger.error(
        `PersonService.updatePerson error [error=${error.message}, personId=${personId}]`,
      );
      return { error: error, data: null };
    }
  }

  async attachPersonToProject(
    projectId: number,
    personId: number,
    dto: AttachPersonToProjectDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.attachPersonToProject called [projectId=${projectId}, personId=${personId}, dto=${JSON.stringify(
          dto,
        )}]`,
      );

      // Validate project exists
      await Promisify(
        this.projectRepoService.get({ where: { ProjectID: projectId } }, true),
      );

      // Validate person exists
      await Promisify(
        this.personRepoService.get({ where: { PersonID: personId } }, true),
      );

      // Validate createdByUser exists
      await Promisify(
        this.userRepoService.get(
          { where: { UserID: dto.createdByUserId } },
          true,
        ),
      );

      // Check if attachment already exists
      const existingAttachment = await Promisify<PersonProject>(
        this.personProjectRepoService.get(
          {
            where: {
              ProjectID: projectId,
              PersonID: personId,
            },
          },
          false,
        ),
      );

      if (existingAttachment) {
        this.logger.info(
          `PersonService.attachPersonToProject - attachment already exists [projectId=${projectId}, personId=${personId}]`,
        );
        return { error: null, data: existingAttachment };
      }

      // Create new attachment
      const attachmentData = {
        ProjectID: projectId,
        PersonID: personId,
        Tag: dto.tag || null,
        CreatedByUserID: dto.createdByUserId,
      };

      const personProject = await Promisify<PersonProject>(
        this.personProjectRepoService.create(attachmentData),
      );

      this.logger.info(
        `PersonService.attachPersonToProject success [personProjectId=${personProject.PersonProjectID}]`,
      );
      return { error: null, data: personProject };
    } catch (error) {
      this.logger.error(
        `PersonService.attachPersonToProject error [error=${error.message}, projectId=${projectId}, personId=${personId}]`,
      );
      return { error: error, data: null };
    }
  }

  async detachPersonFromProject(
    projectId: number,
    personId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.detachPersonFromProject called [projectId=${projectId}, personId=${personId}]`,
      );

      await Promisify(
        this.personProjectRepoService.delete({
          ProjectID: projectId,
          PersonID: personId,
        }),
      );

      this.logger.info(
        `PersonService.detachPersonFromProject success [projectId=${projectId}, personId=${personId}]`,
      );
      return { error: null, data: { removed: true } };
    } catch (error) {
      this.logger.error(
        `PersonService.detachPersonFromProject error [error=${error.message}, projectId=${projectId}, personId=${personId}]`,
      );
      return { error: error, data: null };
    }
  }

  async getProjectPersons(projectId: number): Promise<ResultWithError> {
    try {
      this.logger.info(
        `PersonService.getProjectPersons called [projectId=${projectId}]`,
      );

      const personProjects = await Promisify<PersonProject[]>(
        this.personProjectRepoService.getAll({
          where: { ProjectID: projectId },
        }),
      );

      this.logger.info(
        `PersonService.getProjectPersons success [projectId=${projectId}, count=${personProjects.length}]`,
      );
      return { error: null, data: personProjects };
    } catch (error) {
      this.logger.error(
        `PersonService.getProjectPersons error [error=${error.message}, projectId=${projectId}]`,
      );
      return { error: error, data: null };
    }
  }
}

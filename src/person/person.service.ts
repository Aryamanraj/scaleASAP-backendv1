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
      this.logger.info('PersonService.createPerson called', { dto });

      // Validate createdByUser exists
      await Promisify(
        this.userRepoService.get(
          { where: { UserID: dto.createdByUserId } },
          true,
        ),
      );

      const personData = {
        PrimaryDisplayName: dto.primaryDisplayName || null,
        Status: dto.status || EntityStatus.ACTIVE,
        CreatedByUserID: dto.createdByUserId,
      };

      const person = await Promisify<Person>(
        this.personRepoService.create(personData),
      );

      this.logger.info('PersonService.createPerson success', {
        personId: person.PersonID,
      });
      return { error: null, data: person };
    } catch (error) {
      this.logger.error('PersonService.createPerson error', {
        error: error.message,
        dto,
      });
      return { error: error, data: null };
    }
  }

  async listPersons(filters: ListPersonsQueryDto): Promise<ResultWithError> {
    try {
      this.logger.info('PersonService.listPersons called', { filters });

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

      this.logger.info('PersonService.listPersons success', {
        count: persons.length,
      });
      return { error: null, data: persons };
    } catch (error) {
      this.logger.error('PersonService.listPersons error', {
        error: error.message,
      });
      return { error: error, data: null };
    }
  }

  async getPersonById(personId: number): Promise<ResultWithError> {
    try {
      this.logger.info('PersonService.getPersonById called', { personId });

      const person = await Promisify<Person>(
        this.personRepoService.get({ where: { PersonID: personId } }, true),
      );

      this.logger.info('PersonService.getPersonById success', { personId });
      return { error: null, data: person };
    } catch (error) {
      this.logger.error('PersonService.getPersonById error', {
        error: error.message,
        personId,
      });
      return { error: error, data: null };
    }
  }

  async updatePerson(
    personId: number,
    dto: UpdatePersonDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('PersonService.updatePerson called', {
        personId,
        dto,
      });

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

      this.logger.info('PersonService.updatePerson success', { personId });
      return { error: null, data: person };
    } catch (error) {
      this.logger.error('PersonService.updatePerson error', {
        error: error.message,
        personId,
      });
      return { error: error, data: null };
    }
  }

  async attachPersonToProject(
    projectId: number,
    personId: number,
    dto: AttachPersonToProjectDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('PersonService.attachPersonToProject called', {
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
          'PersonService.attachPersonToProject - attachment already exists',
          { projectId, personId },
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

      this.logger.info('PersonService.attachPersonToProject success', {
        personProjectId: personProject.PersonProjectID,
      });
      return { error: null, data: personProject };
    } catch (error) {
      this.logger.error('PersonService.attachPersonToProject error', {
        error: error.message,
        projectId,
        personId,
      });
      return { error: error, data: null };
    }
  }

  async detachPersonFromProject(
    projectId: number,
    personId: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('PersonService.detachPersonFromProject called', {
        projectId,
        personId,
      });

      await Promisify(
        this.personProjectRepoService.delete({
          ProjectID: projectId,
          PersonID: personId,
        }),
      );

      this.logger.info('PersonService.detachPersonFromProject success', {
        projectId,
        personId,
      });
      return { error: null, data: { removed: true } };
    } catch (error) {
      this.logger.error('PersonService.detachPersonFromProject error', {
        error: error.message,
        projectId,
        personId,
      });
      return { error: error, data: null };
    }
  }

  async getProjectPersons(projectId: number): Promise<ResultWithError> {
    try {
      this.logger.info('PersonService.getProjectPersons called', {
        projectId,
      });

      const personProjects = await Promisify<PersonProject[]>(
        this.personProjectRepoService.getAll({
          where: { ProjectID: projectId },
        }),
      );

      this.logger.info('PersonService.getProjectPersons success', {
        projectId,
        count: personProjects.length,
      });
      return { error: null, data: personProjects };
    } catch (error) {
      this.logger.error('PersonService.getProjectPersons error', {
        error: error.message,
        projectId,
      });
      return { error: error, data: null };
    }
  }
}

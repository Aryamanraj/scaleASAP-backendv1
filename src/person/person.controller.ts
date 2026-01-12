import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { Person } from '../repo/entities/person.entity';
import { PersonProject } from '../repo/entities/person-project.entity';
import { PersonService } from './person.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { ListPersonsQueryDto } from './dto/list-persons-query.dto';
import { AttachPersonToProjectDto } from './dto/attach-person-to-project.dto';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';
import { OptionalUserId } from '../common/decorators/userId-optional.decorator';

@Controller('persons')
@ApiTags('Persons')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class PersonController {
  constructor(private personService: PersonService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new person' })
  @ApiOkResponseGeneric({
    type: Person,
    description: 'Person created successfully',
  })
  async createPerson(
    @Body() createPersonDto: CreatePersonDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Person created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const person = await Promisify<Person>(
        this.personService.createPerson(createPersonDto),
      );
      resData = person;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create person : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all persons with optional filters' })
  @ApiOkResponseGeneric({
    type: Person,
    isArray: true,
    description: 'Persons fetched successfully',
  })
  async listPersons(@Query() query: ListPersonsQueryDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Persons fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const persons = await Promisify<Person[]>(
        this.personService.listPersons(query),
      );
      resData = persons;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch persons : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':personId')
  @ApiOperation({ summary: 'Get person by ID' })
  @ApiOkResponseGeneric({
    type: Person,
    description: 'Person fetched successfully',
  })
  async getPersonById(
    @Param('personId', ParseIntPipe) personId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Person fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const person = await Promisify<Person>(
        this.personService.getPersonById(personId),
      );
      resData = person;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch person : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch(':personId')
  @ApiOperation({ summary: 'Update person' })
  @ApiOkResponseGeneric({
    type: Person,
    description: 'Person updated successfully',
  })
  async updatePerson(
    @Param('personId', ParseIntPipe) personId: number,
    @Body() updatePersonDto: UpdatePersonDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Person updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const person = await Promisify<Person>(
        this.personService.updatePerson(personId, updatePersonDto),
      );
      resData = person;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update person : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

@Controller('projects')
@ApiTags('Persons')
@ApiBearerAuth('Api-auth')
@UseGuards(CompositeAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class PersonProjectController {
  constructor(private personService: PersonService) {}

  @Post(':projectId/persons/:personId')
  @ApiOperation({ summary: 'Attach person to project' })
  @ApiOkResponseGeneric({
    type: PersonProject,
    description: 'Person attached to project successfully',
  })
  async attachPersonToProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Body() attachDto: AttachPersonToProjectDto,
    @OptionalUserId() userId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'Person attached to project successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const personProject = await Promisify<PersonProject>(
        this.personService.attachPersonToProject(projectId, personId, {
          tag: attachDto.tag,
          createdByUserId: attachDto.createdByUserId ?? userId,
        }),
      );
      resData = personProject;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to attach person to project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete(':projectId/persons/:personId')
  @ApiOperation({ summary: 'Detach person from project' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Person detached from project successfully',
  })
  async detachPersonFromProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('personId', ParseIntPipe) personId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Person detached from project successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const result = await Promisify<{ removed: boolean }>(
        this.personService.detachPersonFromProject(projectId, personId),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to detach person from project : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':projectId/persons')
  @ApiOperation({ summary: 'Get all persons attached to a project' })
  @ApiOkResponseGeneric({
    type: PersonProject,
    isArray: true,
    description: 'Project persons fetched successfully',
  })
  async getProjectPersons(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Project persons fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const personProjects = await Promisify<PersonProject[]>(
        this.personService.getProjectPersons(projectId),
      );
      resData = personProjects;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch project persons : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

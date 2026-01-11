import {
  Body,
  Controller,
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
import { User } from '../repo/entities/user.entity';
import { ProjectUser } from '../repo/entities/project-user.entity';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiOkResponseGeneric({
    type: User,
    description: 'User created successfully',
  })
  async createUser(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    let resStatus = HttpStatus.CREATED;
    let resMessage = 'User created successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const user = await Promisify<User>(
        this.userService.createUser(createUserDto),
      );
      resData = user;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create user : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users for a company' })
  @ApiOkResponseGeneric({
    type: User,
    isArray: true,
    description: 'Users fetched successfully',
  })
  async listUsers(@Query() query: ListUsersQueryDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Users fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const users = await Promisify<User[]>(
        this.userService.listUsers(query.companyId),
      );
      resData = users;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch users : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponseGeneric({
    type: User,
    description: 'User fetched successfully',
  })
  async getUserById(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'User fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const user = await Promisify<User>(this.userService.getUserById(userId));
      resData = user;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch user : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user' })
  @ApiOkResponseGeneric({
    type: User,
    description: 'User updated successfully',
  })
  async updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'User updated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const user = await Promisify<User>(
        this.userService.updateUser(userId, updateUserDto),
      );
      resData = user;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update user : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get(':userId/projects')
  @ApiOperation({ summary: 'Get all projects for a user' })
  @ApiOkResponseGeneric({
    type: ProjectUser,
    isArray: true,
    description: 'User projects fetched successfully',
  })
  async getUserProjects(
    @Param('userId', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'User projects fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const projectUsers = await Promisify<ProjectUser[]>(
        this.userService.getUserProjects(userId),
      );
      resData = projectUsers;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch user projects : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

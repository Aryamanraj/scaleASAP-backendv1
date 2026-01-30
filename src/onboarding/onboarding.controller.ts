import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { WorkspaceAccessGuard } from '../workspace/guards/workspace-access.guard';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { OnboardingService } from './onboarding.service';
import { UpsertOnboardingDataDto } from './dto/upsert-onboarding-data.dto';
import { OnboardingDataResponseDto } from './dto/onboarding-data-response.dto';

@Controller()
@ApiTags('Onboarding')
@ApiBearerAuth('Supabase-auth')
@UseGuards(SupabaseAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get('workspaces/:id/onboarding')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Get onboarding data for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: OnboardingDataResponseDto,
    description: 'Onboarding data fetched successfully',
  })
  async getOnboardingData(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Onboarding data fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const data = await Promisify<OnboardingDataResponseDto>(
        this.onboardingService.getOnboardingData(workspaceId),
      );
      resData = data;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch onboarding data: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Put('workspaces/:id/onboarding')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: 'Create or update onboarding data for a workspace' })
  @ApiParam({ name: 'id', description: 'Workspace ID' })
  @ApiOkResponseGeneric({
    type: OnboardingDataResponseDto,
    description: 'Onboarding data saved successfully',
  })
  async upsertOnboardingData(
    @Param('id', ParseIntPipe) workspaceId: number,
    @Body() dto: UpsertOnboardingDataDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Onboarding data saved successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const data = await Promisify<OnboardingDataResponseDto>(
        this.onboardingService.upsertOnboardingData(workspaceId, dto),
      );
      resData = data;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to save onboarding data: ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

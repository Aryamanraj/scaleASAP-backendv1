import {
  Body,
  Controller,
  HttpStatus,
  Post,
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
import { ScraperService } from './scraper.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { SearchRequestDto } from './dto/search-request.dto';
import {
  ScraperResponse,
  SearchResponse,
} from '../common/interfaces/scraper.interfaces';

@Controller('scraper')
@ApiTags('Scraper')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ScraperController {
  constructor(private scraperService: ScraperService) {}

  @Post('scrape')
  @ApiOperation({ summary: 'Execute a generic scraper request' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Scraper request completed successfully',
  })
  async scrape(@Body() dto: ScrapeRequestDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Scraper request completed successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const scraperRequest = {
        provider: dto.provider,
        taskType: dto.taskType,
        payload: dto.payload,
        options: dto.options,
      };

      const response = await Promisify<ScraperResponse>(
        this.scraperService.scrape(scraperRequest),
      );
      resData = response;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to execute scraper request : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('search')
  @ApiOperation({ summary: 'Execute a search request with pagination' })
  @ApiOkResponseGeneric({
    type: Object,
    description: 'Search request completed successfully',
  })
  async search(@Body() dto: SearchRequestDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Search request completed successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const searchRequest = {
        provider: dto.provider,
        payload: dto.payload,
        options: {
          maxPages: dto.maxPages,
          maxItems: dto.maxItems,
          pageSizeOverride: dto.pageSizeOverride,
        },
      };

      const response = await Promisify<SearchResponse>(
        this.scraperService.search(searchRequest),
      );
      resData = response;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to execute search request : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

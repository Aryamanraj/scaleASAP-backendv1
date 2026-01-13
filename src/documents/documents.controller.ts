import {
  Body,
  Controller,
  Get,
  HttpStatus,
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
import { Document } from '../repo/entities/document.entity';
import { DocumentsService } from './documents.service';
import { ListDocumentsQueryDto } from './dto/list-documents.dto';
import { InvalidateDocumentDto } from './dto/invalidate-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';

@Controller('documents')
@ApiTags('Documents')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents with filters' })
  @ApiOkResponseGeneric({
    type: Document,
    isArray: true,
    description: 'Documents fetched successfully',
  })
  async listDocuments(
    @Query() query: ListDocumentsQueryDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Documents fetched successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const documents = await Promisify<Document[]>(
        this.documentsService.listDocuments(query),
      );
      resData = documents;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch documents : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('invalidate')
  @ApiOperation({ summary: 'Invalidate a document' })
  @ApiOkResponseGeneric({
    type: Document,
    description: 'Document invalidated successfully',
  })
  async invalidateDocument(
    @Body() invalidateDocumentDto: InvalidateDocumentDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Document invalidated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const document = await Promisify<Document>(
        this.documentsService.invalidateDocument(invalidateDocumentDto),
      );
      resData = document;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to invalidate document : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Revalidate a document' })
  @ApiOkResponseGeneric({
    type: Document,
    description: 'Document validated successfully',
  })
  async validateDocument(
    @Body() validateDocumentDto: ValidateDocumentDto,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Document validated successfully';
    let resData = null;
    let resSuccess = true;

    try {
      const document = await Promisify<Document>(
        this.documentsService.validateDocument(validateDocumentDto),
      );
      resData = document;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to validate document : ${
        error?.message ?? 'Unknown error'
      }`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

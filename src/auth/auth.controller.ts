import {
  Controller,
  Post,
  HttpStatus,
  Res,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth api')
@ApiBearerAuth('Api-auth')
@UsePipes(new ValidationPipe({ transform: true }))
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/admin/validate')
  @ApiOkResponseGeneric({
    type: Boolean,
    description: 'Validate admin api key',
  })
  async validateAdminApiKey(@Res() res: Response, @Req() req: Request) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Admin api key validation result';
    let resData = null;
    let resSuccess = true;

    try {
      const apiKey = req?.headers?.['x-api-key'] as string | undefined;
      const result = await Promisify<boolean>(
        this.authService.validateAdminApiKey(apiKey),
      );
      resData = result;
    } catch (error) {
      resStatus = error?.status
        ? error.status
        : HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Could not validate admin api key : ${error.message}`;
      resSuccess = false;
    }

    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}

import {
  Controller,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
@Controller('admin')
@ApiTags('Admin Apis')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class AdminController {
  // @Post('/indexed-state')
  // @ApiOkResponseGeneric({
  //   type: Boolean,
  //   description: 'Create last indexed state',
  // })
  // async handleIndexedState(
  //   @Body() indexedState: IndexedStateDto,
  //   @Res() res: Response,
  // ) {
  //   let resStatus = HttpStatus.CREATED;
  //   let resMessage = 'Created new indexeed state';
  //   let resData = null;
  //   let resSuccess = true;
  //   try {
  //     const result = await Promisify<boolean>(
  //       this.adminService.handleIndexedState(indexedState),
  //     );
  //     resData = result;
  //   } catch (error) {
  //     resStatus = error?.status
  //       ? error.status
  //       : HttpStatus.INTERNAL_SERVER_ERROR;
  //     resMessage = `Could not update last indexed state : ${error.message}`;
  //     resSuccess = false;
  //   }
  //   makeResponse(res, resStatus, resSuccess, resMessage, resData);
  // }
  // @Post('/lateSendPongSettlement/start')
  // @ApiOkResponseGeneric({
  //   type: Boolean,
  //   description: 'Start late send pong settlement cron',
  // })
  // async startLateSendPongSettlementChecker(
  //   @Res() res: Response,
  //   @Body() data: StartCronDto,
  // ) {
  //   let resStatus = HttpStatus.OK;
  //   let resMessage = 'Started late send pong settlement update scheduler';
  //   let resData = null;
  //   let resSuccess = true;
  //   try {
  //     const result = await this.schedulerService.startLatePongSettlementChecker(
  //       data.timePeriod as CronExpression,
  //     );
  //     if (result.error) throw result.error;
  //     resData = result.data;
  //   } catch (error) {
  //     resStatus = resStatus = error?.status
  //       ? error.status
  //       : HttpStatus.INTERNAL_SERVER_ERROR;
  //     resMessage = `Could not start late send pong settlement update scheduler : ${error.message}`;
  //     resSuccess = false;
  //   }
  //   makeResponse(res, resStatus, resSuccess, resMessage, resData);
  // }
  // @Post('/lateSendPongSettlement/stop')
  // @ApiOkResponseGeneric({
  //   type: Boolean,
  //   description: 'Stop late send pong settlement cron',
  // })
  // async stopLateSendPongSettlementChecker(@Res() res: Response) {
  //   let resStatus = HttpStatus.OK;
  //   let resMessage = 'Stopped late send pong settlement update scheduler';
  //   let resData = null;
  //   let resSuccess = true;
  //   try {
  //     const result = await this.schedulerService.stopPongSettlementChecker();
  //     if (result.error) throw result.error;
  //     resData = result.data;
  //   } catch (error) {
  //     resStatus = resStatus = error?.status
  //       ? error.status
  //       : HttpStatus.INTERNAL_SERVER_ERROR;
  //     resMessage = `Could not stop late send pong settlement update scheduler : ${error.message}`;
  //     resSuccess = false;
  //   }
  //   makeResponse(res, resStatus, resSuccess, resMessage, resData);
  // }
}

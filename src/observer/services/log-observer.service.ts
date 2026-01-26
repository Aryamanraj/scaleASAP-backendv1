import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RpcService } from '../../rpc/rpc.service';
import { Logger } from 'winston';
import { ResultWithError } from '../../common/interfaces';

@Injectable()
export class LogObserverService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private rpcService: RpcService,
  ) {}

  async handleSendPong(data: any): Promise<ResultWithError> {
    try {
      this.logger.info(
        `Processing send pong from logs queue [data : ${JSON.stringify(data)}]`,
      );

      return { error: null, data: true };
    } catch (error) {
      this.logger.error(
        `Error in processing withdraw event from logs queue [data : ${JSON.stringify(
          data,
        )}] : ${error.stack}`,
      );
      return { error, data: null };
    }
  }
}

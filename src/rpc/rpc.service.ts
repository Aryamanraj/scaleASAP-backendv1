/* eslint-disable @typescript-eslint/no-unused-vars */
import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { QueueNames } from '../common/constants';
import { Logger } from 'winston';

import { ONCHAIN_CONFIG } from '../common/web3';
import { ethers } from 'ethers';

@Injectable()
export class RpcService implements OnApplicationBootstrap {
  private env: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.NEW_LOGS) private logsQueue: Queue,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const defaultConfig = ONCHAIN_CONFIG;
    this.env = (this.configService.get('NODE_ENV') ||
      'development') as keyof typeof defaultConfig;
    await this.initializeConfig(defaultConfig);
    await this.initConnection();
  }

  private async initializeConfig(defaultConfig) {
    this.logger.info(`Initializing connection...`);

    this.logger.info(`Connected`);
  }

  private async initConnection() {
    this.logger.info(`Initializing connection to Ethereum RPC...`);

    this.logger.info(`Connected!`);
  }
}

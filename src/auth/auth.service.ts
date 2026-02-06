import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ResultWithError } from '../common/interfaces';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
  ) {}

  async validateAdminApiKey(apiKey?: string): Promise<ResultWithError> {
    try {
      const expectedKey = this.configService.get<string>('ADMIN_API_KEY');
      const isValid = Boolean(apiKey && expectedKey && apiKey === expectedKey);
      this.logger.info(`Admin api key validation [isValid=${isValid}]`);
      return { data: isValid, error: null };
    } catch (error) {
      this.logger.error(
        `Error validating admin api key: ${error?.stack || error}`,
      );
      return { data: false, error };
    }
  }
}

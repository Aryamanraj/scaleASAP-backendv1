import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserRepoService } from '../../repo/user-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { User } from '../../repo/entities/user.entity';
import { JwtPayload } from '../../common/interfaces';

@Injectable()
export class UserAuthGuard implements CanActivate {
  private jwtSecret: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
    private userRepo: UserRepoService,
  ) {
    this.jwtSecret = this.configService.get('ACCESS_TOKEN')?.SECRET;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.info(`Validating user api headers`);
    const req = context.switchToHttp().getRequest();

    try {
      const token = req?.headers?.authorization?.split(' ')[1];
      if (!token) throw new Error(`Auth token not found`);

      const { userId } = jwt.verify(token, this.jwtSecret) as JwtPayload;
      if (!userId) throw new Error(`Invalid auth tokens`);
      let user: User | null = null;

      if (userId) {
        user = await Promisify<User>(
          this.userRepo.get({ where: { UserID: Number(userId) } }),
        );
      }

      if (!user) throw new Error(`User not found`);

      req.userId = user.UserID;
      return true;
    } catch (error) {
      this.logger.error(
        `Error in validating user api headers [headers : ${JSON.stringify(
          req.headers,
        )}] : ${error.stack}`,
      );
      return false;
    }
  }
}

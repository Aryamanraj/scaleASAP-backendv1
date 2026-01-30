import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as jwksClient from 'jwks-rsa';
import { UserRepoService } from '../../repo/user-repo.service';
import { ClientRepoService } from '../../repo/client-repo.service';
import { Promisify } from '../../common/helpers/promisifier';
import { User } from '../../repo/entities/user.entity';
import { Client } from '../../repo/entities/client.entity';
import { SupabaseJwtPayload } from '../../common/interfaces';
import {
  UserRole,
  EntityStatus,
} from '../../common/constants/entity.constants';

/**
 * SupabaseAuthGuard - Validates Supabase JWT tokens from frontend-v1
 *
 * This guard:
 * 1. Extracts and validates the Supabase JWT from the Authorization header
 * 2. Supports both HS256 (legacy) and ES256 (ECC P-256) algorithms via JWKS
 * 3. Auto-provisions a Client + User on first login (no pre-registration needed)
 * 4. Attaches user info to the request for downstream use
 *
 * Usage:
 *   @UseGuards(SupabaseAuthGuard)
 *   @Controller('workspace')
 *   export class WorkspaceController { ... }
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabaseJwtSecret: string;
  private supabaseUrl: string;
  private jwksClientInstance: jwksClient.JwksClient;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private configService: ConfigService,
    private userRepo: UserRepoService,
    private clientRepo: ClientRepoService,
  ) {
    this.supabaseJwtSecret =
      this.configService.get<string>('supabase.jwtSecret');
    this.supabaseUrl = this.configService.get<string>('supabase.url');

    // Initialize JWKS client for ES256 verification
    if (this.supabaseUrl) {
      this.jwksClientInstance = jwksClient.default({
        jwksUri: `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    try {
      const token = this.extractToken(req);
      if (!token) {
        throw new UnauthorizedException('No authorization token provided');
      }

      // Decode token header to check algorithm
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        throw new UnauthorizedException('Invalid token format');
      }

      let payload: SupabaseJwtPayload;

      if (decoded.header.alg === 'HS256') {
        // Legacy HS256 verification with shared secret
        if (!this.supabaseJwtSecret) {
          this.logger.error(
            'SupabaseAuthGuard: SUPABASE_JWT_SECRET not configured for HS256',
          );
          throw new UnauthorizedException('Authentication not configured');
        }
        payload = jwt.verify(token, this.supabaseJwtSecret, {
          algorithms: ['HS256'],
        }) as SupabaseJwtPayload;
      } else if (decoded.header.alg === 'ES256') {
        // ES256 (ECC P-256) verification with JWKS
        if (!this.jwksClientInstance) {
          this.logger.error(
            'SupabaseAuthGuard: SUPABASE_URL not configured for ES256/JWKS',
          );
          throw new UnauthorizedException('Authentication not configured');
        }
        const signingKey = await this.getSigningKey(decoded.header.kid);
        payload = jwt.verify(token, signingKey, {
          algorithms: ['ES256'],
        }) as SupabaseJwtPayload;
      } else {
        throw new UnauthorizedException(
          `Unsupported algorithm: ${decoded.header.alg}`,
        );
      }

      if (payload.role !== 'authenticated') {
        throw new UnauthorizedException('User not authenticated with Supabase');
      }

      const user = await this.getOrCreateUser(payload);

      // Attach user info to request for controllers/services
      req.user = user;
      req.userId = user.UserID;
      req.clientId = user.ClientID;
      req.supabaseUserId = payload.sub;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error.name === 'TokenExpiredError') {
        this.logger.warn(`SupabaseAuthGuard: Token expired`);
        throw new UnauthorizedException('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        this.logger.warn(
          `SupabaseAuthGuard: Invalid token [error=${error.message}]`,
        );
        throw new UnauthorizedException('Invalid token');
      }
      this.logger.error(`SupabaseAuthGuard: Failed [error=${error.stack}]`);
      throw new UnauthorizedException(error.message);
    }
  }

  private extractToken(req: any): string | null {
    const [type, token] = req.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }

  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClientInstance.getSigningKey(kid, (err, key) => {
        if (err) {
          this.logger.error(
            `SupabaseAuthGuard: Failed to get signing key [error=${err.message}]`,
          );
          reject(err);
          return;
        }
        const signingKey = key.getPublicKey();
        resolve(signingKey);
      });
    });
  }

  private async getOrCreateUser(payload: SupabaseJwtPayload): Promise<User> {
    // Try to get existing user by SupabaseUserID
    try {
      const existingUser = await Promisify<User>(
        this.userRepo.get(
          { where: { SupabaseUserID: payload.sub } },
          false, // panic=false means no error thrown if not found
        ),
      );
      if (existingUser) {
        this.logger.info(
          `SupabaseAuthGuard: User found [userId=${existingUser.UserID}, sub=${payload.sub}]`,
        );
        return existingUser;
      }
    } catch {
      // User not found - fall through to auto-provisioning
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-PROVISIONING: First-time Supabase user
    // ═══════════════════════════════════════════════════════════════

    this.logger.info(
      `SupabaseAuthGuard: Auto-provisioning user [sub=${payload.sub}, email=${payload.email}]`,
    );

    // 1. Create personal Client (organization) for this user
    const client = await Promisify<Client>(
      this.clientRepo.create({
        Name: payload.user_metadata?.full_name
          ? `${payload.user_metadata.full_name}'s Organization`
          : `${payload.email?.split('@')[0]}'s Organization`,
        Slug: this.generateSlug(payload.email),
      }),
    );

    this.logger.info(
      `SupabaseAuthGuard: Created client [clientId=${client.ClientID}]`,
    );

    // 2. Create User linked to their personal Client
    const user = await Promisify<User>(
      this.userRepo.create({
        SupabaseUserID: payload.sub,
        Email: payload.email,
        Name:
          payload.user_metadata?.full_name ||
          payload.email?.split('@')[0] ||
          'User',
        ClientID: client.ClientID,
        Role: UserRole.ADMIN, // Admin of their own org
        Status: EntityStatus.ACTIVE,
      }),
    );

    this.logger.info(
      `SupabaseAuthGuard: Created user [userId=${user.UserID}, email=${user.Email}]`,
    );

    return user;
  }

  private generateSlug(email: string): string {
    const base = email?.split('@')[0]?.toLowerCase() || 'user';
    const random = Math.random().toString(36).substring(2, 8);
    return `${base}-${random}`.replace(/[^a-z0-9-]/g, '-');
  }
}

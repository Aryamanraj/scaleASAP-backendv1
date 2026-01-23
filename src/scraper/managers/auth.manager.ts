/**
 * Auth Manager
 * Handles authentication flow for web scraping sessions
 * All methods return ResultWithError for proper error handling
 */

import { Logger } from 'winston';
import { fetch } from 'undici';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';
import { SessionManager } from './session.manager';
import { SCRAPER_CONFIG } from '../scraper.config';

export interface AuthConfig {
  mode: 'form' | 'json';
  loginPath: string;
  usernameField: string;
  passwordField: string;
  additionalFields?: Record<string, any>;
  credentials: {
    username: string;
    password: string;
  };
}

export class AuthManager {
  private baseUrl: string;
  private config: AuthConfig;
  private session: SessionManager;
  private logger: Logger;
  private isAuthenticated = false;

  constructor(
    baseUrl: string,
    config: AuthConfig,
    session: SessionManager,
    logger: Logger,
  ) {
    this.baseUrl = baseUrl;
    this.config = config;
    this.session = session;
    this.logger = logger;
  }

  /**
   * Ensure we have a valid authenticated session
   * Performs login if necessary
   */
  async ensureAuthenticated(): Promise<ResultWithError> {
    try {
      if (this.isAuthenticated) {
        return { error: null, data: true };
      }

      return await this.login();
    } catch (error) {
      this.logger.error(
        `AuthManager.ensureAuthenticated: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Force re-authentication (e.g., after 401/403)
   */
  async forceReauthenticate(): Promise<ResultWithError> {
    try {
      this.logger.info(
        'AuthManager.forceReauthenticate: Forcing re-authentication',
      );
      this.isAuthenticated = false;
      return await this.login();
    } catch (error) {
      this.logger.error(
        `AuthManager.forceReauthenticate: Error - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  /**
   * Perform login request
   */
  private async login(): Promise<ResultWithError> {
    try {
      const url = `${this.baseUrl}${this.config.loginPath}`;
      const { username, password } = this.config.credentials;

      this.logger.info(
        `AuthManager.login: Logging in [url=${url}, mode=${this.config.mode}]`,
      );

      // Get cookies before login
      const cookieHeader = await Promisify<string>(
        this.session.getCookieString(url),
      );

      // Build request body
      const body: Record<string, any> = {
        [this.config.usernameField]: username,
        [this.config.passwordField]: password,
        ...this.config.additionalFields,
      };

      // Determine content type based on mode
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/login`,
        'User-Agent': SCRAPER_CONFIG.USER_AGENT,
      };

      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      let bodyContent: string;

      if (this.config.mode === 'json') {
        headers['Content-Type'] = 'application/json';
        bodyContent = JSON.stringify(body);
      } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        bodyContent = new URLSearchParams(body).toString();
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: bodyContent,
      });

      if (!response.ok) {
        throw new Error(
          `Login failed: HTTP ${response.status} ${response.statusText}`,
        );
      }

      // Save cookies from login response using Promisify
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      if (setCookieHeaders.length > 0) {
        await Promisify<boolean>(
          this.session.setCookiesFromHeaders(setCookieHeaders, url),
        );
      }

      this.isAuthenticated = true;
      this.logger.info('AuthManager.login: Login successful');
      return { error: null, data: true };
    } catch (error) {
      this.logger.error(`AuthManager.login: Login failed - ${error.stack}`);
      return { error: error, data: null };
    }
  }
}

/**
 * Session Manager
 * Manages cookie persistence for maintaining authenticated sessions
 * All methods return ResultWithError for proper error handling
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { Logger } from 'winston';
import { CookieJar, Cookie } from 'tough-cookie';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';

export class SessionManager {
  private jar: CookieJar;
  private sessionFile: string;
  private logger: Logger;

  constructor(sessionFile: string, logger: Logger) {
    this.jar = new CookieJar();
    this.sessionFile = sessionFile;
    this.logger = logger;
  }

  /**
   * Get the cookie jar instance
   */
  getJar(): CookieJar {
    return this.jar;
  }

  /**
   * Load session from disk (if exists)
   */
  async load(): Promise<ResultWithError> {
    try {
      const data = await fs.readFile(this.sessionFile, 'utf-8');
      const serialized = JSON.parse(data);
      this.jar = CookieJar.deserializeSync(serialized);
      return { error: null, data: true };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return { error: null, data: false };
      } else {
        this.logger.error(
          `SessionManager.load: Failed to load session - ${err.stack}`,
        );
        return { error: err, data: null };
      }
    }
  }

  /**
   * Save session to disk
   */
  async save(): Promise<ResultWithError> {
    try {
      await fs.mkdir(dirname(this.sessionFile), { recursive: true });
      const serialized = this.jar.serializeSync();
      await fs.writeFile(
        this.sessionFile,
        JSON.stringify(serialized, null, 2),
        'utf-8',
      );
      return { error: null, data: true };
    } catch (err: any) {
      this.logger.error(
        `SessionManager.save: Failed to save session - ${err.stack}`,
      );
      return { error: err, data: null };
    }
  }

  /**
   * Get cookies as a string for a given URL
   */
  async getCookieString(url: string): Promise<ResultWithError> {
    try {
      const cookies = await this.jar.getCookieString(url);
      return { error: null, data: cookies };
    } catch (err: any) {
      this.logger.error(
        `SessionManager.getCookieString: Failed to get cookies - ${err.stack}`,
      );
      return { error: err, data: null };
    }
  }

  /**
   * Set cookies from Set-Cookie headers
   */
  async setCookiesFromHeaders(
    setCookieHeaders: string[],
    url: string,
  ): Promise<ResultWithError> {
    try {
      for (const header of setCookieHeaders) {
        const cookie = Cookie.parse(header);
        if (cookie) {
          await this.jar.setCookie(cookie, url);
        }
      }
      // Use Promisify to unwrap save() - errors propagate via exception
      await Promisify<boolean>(this.save());
      return { error: null, data: true };
    } catch (err: any) {
      this.logger.error(
        `SessionManager.setCookiesFromHeaders: Failed to set cookies - ${err.stack}`,
      );
      return { error: err, data: null };
    }
  }

  /**
   * Clear all cookies
   */
  async clear(): Promise<ResultWithError> {
    try {
      this.jar = new CookieJar();
      // Use Promisify to unwrap save() - errors propagate via exception
      await Promisify<boolean>(this.save());
      this.logger.info('SessionManager.clear: Session cleared');
      return { error: null, data: true };
    } catch (err: any) {
      this.logger.error(`SessionManager.clear: Error - ${err.stack}`);
      return { error: err, data: null };
    }
  }
}

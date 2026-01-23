/**
 * HTTP Manager
 * Handles all HTTP requests with retry logic, rate limiting, and authentication
 * All methods return ResultWithError for proper error handling
 */

import { Logger } from 'winston';
import { fetch, RequestInit } from 'undici';
import PQueue from 'p-queue';
import { ResultWithError } from '../../common/interfaces';
import { Promisify } from '../../common/helpers/promisifier';
import { SessionManager } from './session.manager';
import { AuthManager } from './auth.manager';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
}

export interface RateLimitConfig {
  concurrency: number;
  intervalMs: number;
}

export class HttpManager {
  private baseUrl: string;
  private session: SessionManager;
  private auth: AuthManager | null;
  private headers: Record<string, string>;
  private retryConfig: RetryConfig;
  private queue: PQueue;
  private logger: Logger;

  constructor(
    baseUrl: string,
    session: SessionManager,
    auth: AuthManager | null,
    headers: Record<string, string>,
    retryConfig: RetryConfig,
    rateLimitConfig: RateLimitConfig,
    logger: Logger,
  ) {
    this.baseUrl = baseUrl;
    this.session = session;
    this.auth = auth;
    this.headers = headers;
    this.retryConfig = retryConfig;
    this.logger = logger;

    // Initialize rate-limited queue
    this.queue = new PQueue({
      concurrency: rateLimitConfig.concurrency,
      interval: rateLimitConfig.intervalMs,
      intervalCap: rateLimitConfig.concurrency,
    });
  }

  /**
   * Execute a GET request
   */
  async get<T>(path: string): Promise<ResultWithError> {
    return this.request<T>('GET', path);
  }

  /**
   * Execute a POST request
   */
  async post<T>(path: string, body: any): Promise<ResultWithError> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Execute an HTTP request with retry logic and rate limiting
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<ResultWithError> {
    try {
      const result = await this.queue.add(() =>
        this.executeRequest<T>(method, path, body),
      );
      return result as ResultWithError;
    } catch (error) {
      this.logger.error(`HttpManager.request: Error - ${error.stack}`);
      return { error: error, data: null };
    }
  }

  /**
   * Execute the actual HTTP request with retries
   */
  private async executeRequest<T>(
    method: string,
    path: string,
    body?: any,
    attempt = 0,
  ): Promise<ResultWithError> {
    try {
      // Ensure we have a valid session (login if needed)
      if (this.auth) {
        await Promisify<boolean>(this.auth.ensureAuthenticated());
      }

      const url = `${this.baseUrl}${path}`;
      const cookies = await Promisify<string>(
        this.session.getCookieString(url),
      );

      const options: RequestInit = {
        method,
        headers: {
          ...this.headers,
          Origin: this.baseUrl,
          Referer: `${this.baseUrl}/app`,
          ...(cookies && { Cookie: cookies }),
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, options);

      // Save any new cookies from response
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      if (setCookieHeaders.length > 0) {
        await Promisify<boolean>(
          this.session.setCookiesFromHeaders(setCookieHeaders, url),
        );
      }

      if (!response.ok) {
        // If 401/403, try re-authenticating once
        if ((response.status === 401 || response.status === 403) && this.auth) {
          this.logger.warn(
            `HttpManager.executeRequest: Authentication failure [status=${response.status}, path=${path}]`,
          );
          await Promisify<boolean>(this.auth.forceReauthenticate());
          // Retry once after re-auth
          if (attempt === 0) {
            return this.executeRequest<T>(method, path, body, attempt + 1);
          }
        }

        throw new Error(
          `HTTP ${response.status}: ${response.statusText} (${method} ${path})`,
        );
      }

      const data = await response.json();
      return { error: null, data: data as T };
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
        this.logger.warn(
          `HttpManager.executeRequest: Retrying after error [error=${
            error.message
          }, attempt=${attempt + 1}, delayMs=${delay}]`,
        );
        await this.sleep(delay);
        return this.executeRequest<T>(method, path, body, attempt + 1);
      }

      this.logger.error(
        `HttpManager.executeRequest: Max retries exceeded - ${error.stack}`,
      );
      return { error: error, data: null };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

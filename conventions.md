# Code Conventions

This document outlines the coding conventions, patterns, and best practices followed in the PingPongIndexer project.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Architecture](#project-architecture)
3. [File Naming Conventions](#file-naming-conventions)
4. [Code Style](#code-style)
5. [TypeScript Conventions](#typescript-conventions)
6. [NestJS Patterns](#nestjs-patterns)
7. [Database Conventions](#database-conventions)
8. [API Conventions](#api-conventions)
9. [Error Handling](#error-handling)
10. [Logging](#logging)
11. [Testing](#testing)
12. [Dependencies](#dependencies)

---

## Technology Stack

- **Framework**: NestJS v9.x
- **Language**: TypeScript v5.x
- **Database**: PostgreSQL with TypeORM v0.3.x
- **Queue Management**: Bull with Redis
- **API Documentation**: Swagger (OpenAPI)
- **Logging**: Winston (via nest-winston)
- **Authentication**: JWT with Passport
- **Blockchain**: ethers.js v6.x
- **Validation**: class-validator & class-transformer
- **Scheduling**: @nestjs/schedule with cron

---

## Project Architecture

### Dual Application Structure

The project contains two separate NestJS applications:

1. **API Server** (`src/app/app.ts`): Handles HTTP requests and API endpoints
2. **Indexer** (`src/indexer/indexer.ts`): Background service for blockchain event processing

### Module Organization

- Each feature is organized as a self-contained NestJS module
- Modules are located in `src/{feature-name}/` directories
- Common functionality is centralized in `src/common/`
- Repository pattern is used for data access via `src/repo/`

### Directory Structure Pattern

```
src/{feature-name}/
  ├── {feature}.module.ts      # Module definition
  ├── {feature}.service.ts     # Business logic
  ├── {feature}.controller.ts  # HTTP endpoints (if applicable)
  ├── dto/                     # Data Transfer Objects
  ├── guards/                  # Route guards (if applicable)
  ├── consumers/               # Queue consumers (if applicable)
  └── services/                # Additional services (if applicable)
```

---

## File Naming Conventions

### General Rules

- Use **kebab-case** for all file names: `transaction-repo.service.ts`
- Include component type in filename: `admin.controller.ts`, `admin.service.ts`
- Group related files in subdirectories when multiple of same type exist

### File Type Suffixes

- **Modules**: `*.module.ts`
- **Services**: `*.service.ts`
- **Controllers**: `*.controller.ts`
- **Entities**: `*.entity.ts`
- **DTOs**: `*.dto.ts`
- **Guards**: `*.guard.ts`
- **Decorators**: `*.decorator.ts`
- **Middlewares**: `*.middleware.ts`
- **Consumers**: `*.consumer.ts`
- **Errors**: `*.error.ts`
- **Interfaces**: `interfaces.ts` (no suffix pattern)
- **Constants**: `constants.ts`
- **Helpers**: File name describes purpose, e.g., `promisifier.ts`, `reponseMaker.ts`

---

## Code Style

### Formatting

- **Indentation**: 2 spaces (no tabs)
- **Line Length**: No hard limit, but aim for readability
- **Quotes**: Single quotes for strings (`'string'`)
- **Semicolons**: Always use semicolons
- **Trailing Commas**: Use in multi-line objects/arrays
- **Formatter**: Prettier with default config

### Code Organization

1. Imports (external, then internal, then relative)
2. Constants and enums
3. Interfaces and types
4. Class definition
5. Constructor
6. Public methods
7. Private methods

### Import Order

```typescript
// 1. External dependencies
import { Injectable, HttpStatus } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

// 2. Internal modules (absolute paths)
import { ResultWithError } from '../common/interfaces';
import { Transaction } from '../repo/entities/transaction.entity';

// 3. Local imports
import { AdminService } from './admin.service';
```

---

## TypeScript Conventions

### Type Definitions

- Use **interfaces** for object shapes and contracts
- Use **enums** for fixed sets of values
- Use **types** for unions, intersections, and complex types
- Always export interfaces and types when used across modules

### Naming Conventions

- **PascalCase** for classes, interfaces, types, and enums: `Transaction`, `ResultWithError`
- **camelCase** for variables, functions, and methods: `handleIndexedState`, `lastIndexedState`
- **SCREAMING_SNAKE_CASE** for constants and enum values: `QUEUE_JOB_NAMES`, `TX_EVENT_TYPE.PING`
- **PascalCase** for entity columns when persisted: `TxHash`, `BlockNumber`, `TxID`

### Type Safety

- **Strict Mode**: Disabled (`strictNullChecks: false`, `noImplicitAny: false`)
- Use explicit types for function parameters and return values
- Use generics where appropriate: `Promisify<T>`, `ResultWithError`
- Avoid `any` where possible, but pragmatic use is acceptable

### Decorators

- Use NestJS decorators for dependency injection and metadata
- Use TypeORM decorators for entity definitions
- Use class-validator decorators for DTO validation
- Use Swagger decorators for API documentation

---

## NestJS Patterns

### Dependency Injection

```typescript
@Injectable()
export class AdminService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectQueue(QueueNames.NEW_LOGS) private logsQueue: Queue,
    private idxStateRepo: IndexedStateRepoService,
  ) {}
}
```

- Use constructor injection for all dependencies
- Use `@Inject()` for custom providers (e.g., Winston logger)
- Use specialized decorators for specific injections: `@InjectQueue()`, `@InjectEntityManager()`
- Mark injected services as `private` or `private readonly`

### Controllers

```typescript
@Controller('admin')
@ApiTags('Admin Apis')
@ApiBearerAuth('Api-auth')
@UseGuards(AdminAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class AdminController {
  constructor(
    private adminService: AdminService,
    private schedulerService: ScheduleService,
  ) {}

  @Post('/indexed-state')
  @ApiOkResponseGeneric({
    type: Boolean,
    description: 'Create last indexed state',
  })
  async handleIndexedState(
    @Body() indexedState: IndexedStateDto,
    @Res() res: Response,
  ) {
    // Implementation
  }
}
```

**Conventions:**
- Apply decorators at class level for common behavior
- Use `@ApiTags()` for Swagger grouping
- Use `@ApiBearerAuth()` for protected routes
- Apply `@UseGuards()` at class level when all routes need protection
- Use `@UsePipes(new ValidationPipe({ transform: true }))` for DTO validation
- Use custom `@ApiOkResponseGeneric()` decorator for response documentation
- Always use `@Res()` decorator to access Express Response object
- Use `async` for all controller methods that perform I/O operations

### Services

```typescript
@Injectable()
export class AdminService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private idxStateRepo: IndexedStateRepoService,
  ) {}

  async handleIndexedState(
    indexedState: IndexedStateDto,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Updating last indexed state [data : ${JSON.stringify(indexedState)}]`);
      // Business logic
      return { data: 'success', error: null };
    } catch (error) {
      this.logger.error(`Error in setting last indexed state: ${error.stack}`);
      return { data: null, error };
    }
  }
}
```

**Conventions:**
- Mark all services with `@Injectable()`
- Return `Promise<ResultWithError>` for operations that may fail
- Log all significant operations and errors
- Use try-catch blocks for error handling
- Never throw errors; return them in the result object

### Response Pattern

All controller methods follow this pattern:

```typescript
async handleIndexedState(@Body() dto: IndexedStateDto, @Res() res: Response) {
  let resStatus = HttpStatus.CREATED;
  let resMessage = 'Created new indexed state';
  let resData = null;
  let resSuccess = true;
  
  try {
    const result = await Promisify<boolean>(
      this.adminService.handleIndexedState(dto),
    );
    resData = result;
  } catch (error) {
    resStatus = error?.status ? error.status : HttpStatus.INTERNAL_SERVER_ERROR;
    resMessage = `Could not update last indexed state : ${error.message}`;
    resSuccess = false;
  }
  
  makeResponse(res, resStatus, resSuccess, resMessage, resData);
}
```

**Key Points:**
- Initialize response variables at the start
- Use `Promisify<T>()` helper to handle service results
- Handle errors with status code extraction
- Use `makeResponse()` helper for consistent response format

---

## Database Conventions

### Entity Location

All database entities are defined in the `src/repo/entities/` directory:

- `transaction.entity.ts` - Transaction records for ping/pong events
- `indexed-state.entity.ts` - State tracking for blockchain indexing

Each entity file contains a single entity class representing a database table.

### Entity Definitions

```typescript
@Entity({ name: 'Transactions' })
export class Transaction extends BaseEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  TxID: number;

  @ApiProperty()
  @Column({ length: 255, nullable: true })
  TxHash: string;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: TX_EVENT_TYPE,
    default: TX_EVENT_TYPE.PING,
  })
  TxType: TX_EVENT_TYPE;

  @ApiProperty()
  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
```

**Conventions:**
- Use `@Entity({ name: 'TableName' })` with PascalCase table names
- Extend `BaseEntity` for active record pattern
- Use **PascalCase** for all column names: `TxHash`, `BlockNumber`
- Add `@ApiProperty()` to all columns for Swagger documentation
- Use `@PrimaryGeneratedColumn()` for auto-increment primary keys
- Specify column types explicitly: `{ type: 'enum', enum: ... }`
- Mark optional fields as `nullable: true`
- Use `@CreateDateColumn()` and `@UpdateDateColumn()` for timestamps
- Use `timestamp with time zone` for timestamp columns
- Use `bigint` for blockchain-related large numbers (timestamps, block numbers)

### Repository Services

```typescript
@Injectable()
export class TransactionRepoService {
  private transactionRepo: Repository<Transaction>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entitymanager: EntityManager,
  ) {
    this.transactionRepo = entitymanager.getRepository(Transaction);
  }

  async getAll(
    options: FindManyOptions<Transaction>,
    panic = true,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Finding transactions [condition: ${JSON.stringify(options)}]`);
      
      const result = await this.transactionRepo.find(options);
      if (result.length === 0 && panic) {
        throw new GenericError('No transactions found!', HttpStatus.NOT_FOUND);
      }
      
      return { data: result, error: null };
    } catch (error) {
      this.logger.error(`Error in fetching transactions: ${error.stack}`);
      return { data: null, error };
    }
  }
}
```

**Conventions:**
- Suffix repository services with `-repo.service.ts`
- Get repository instance from EntityManager in constructor
- Accept TypeORM options objects (`FindManyOptions`, `FindOneOptions`)
- Include `panic` parameter to control error behavior on empty results
- Log queries with stringified conditions
- Return `ResultWithError` type
- Handle errors and return them in result object

### How Repository Services Work

Repository services act as a data access layer between business logic and the database:

1. **Initialization**: Repository services inject `EntityManager` and create a repository instance for their entity:
   ```typescript
   constructor(
     @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
     @InjectEntityManager() private entitymanager: EntityManager,
   ) {
     this.transactionRepo = entitymanager.getRepository(Transaction);
   }
   ```

2. **Standard Methods**: Each repository service provides CRUD operations:
   - `get(options, panic?)` - Find one record
   - `getAll(options, panic?)` - Find multiple records
   - `create(entity)` - Insert a new record
   - `update(where, entity)` - Update existing record(s)
   - Custom query methods as needed

3. **Panic Parameter**: Controls whether to throw errors on empty results:
   - `panic = true` (default): Throws `GenericError` if no results found
   - `panic = false`: Returns empty result without throwing

4. **Error Handling**: All methods follow the same pattern:
   - Wrap operations in try-catch
   - Log the operation with conditions
   - Return `{ data, error: null }` on success
   - Return `{ data: null, error }` on failure

5. **Usage Pattern**: Services call repository methods and use `Promisify()` to unwrap results:
   ```typescript
   const transaction = await Promisify<Transaction>(
     this.transactionRepo.get({ where: { TxHash: data.txHash } }),
   );
   ```

---

## API Conventions

### DTOs (Data Transfer Objects)

```typescript
export class IndexedStateDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  network: string;

  @ApiProperty()
  @IsOptional()
  blockNumber?: number;

  @ApiProperty()
  @IsOptional()
  contractAddress?: string;
}
```

**Conventions:**
- Suffix DTO files with `.dto.ts`
- Use class-validator decorators for validation
- Use `@ApiProperty()` for Swagger documentation
- Use **camelCase** for DTO properties
- Mark optional fields with `@IsOptional()` and TypeScript `?` operator
- Use `@IsNotEmpty()` instead of `@IsRequired()`
- Apply `@UsePipes(new ValidationPipe({ transform: true }))` at controller level

### Response Format

All API responses follow this structure:

```typescript
{
  success: boolean,
  message: string,
  data: any | null
}
```

Use the `makeResponse()` helper:

```typescript
makeResponse(res, statusCode, success, message, data);
```

### API Documentation

- Use `@ApiTags()` to group endpoints
- Use `@ApiBearerAuth('Api-auth')` for protected routes
- Use custom `@ApiOkResponseGeneric()` decorator for response types
- Document all DTOs with `@ApiProperty()`
- Include description in decorator options

---

## Error Handling

### Custom Errors

```typescript
export class GenericError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
```

**Conventions:**
- Suffix error classes with `.error.ts`
- Extend built-in `Error` class
- Include `status` property for HTTP status codes
- Throw only in repository services when `panic = true`

### Service Error Pattern

Services return errors instead of throwing:

```typescript
try {
  // Operation
  return { data: result, error: null };
} catch (error) {
  this.logger.error(`Error message: ${error.stack}`);
  return { data: null, error };
}
```

### Controller Error Pattern

Controllers catch errors and extract status:

```typescript
try {
  const result = await Promisify<T>(this.service.method());
  resData = result;
} catch (error) {
  resStatus = error?.status ? error.status : HttpStatus.INTERNAL_SERVER_ERROR;
  resMessage = `Could not perform operation : ${error.message}`;
  resSuccess = false;
}
```

### ResultWithError Interface

```typescript
export interface ResultWithError {
  error: any;
  data: any;
}
```

All service methods that can fail return this interface.

### Promisify Helper

The `Promisify<T>()` helper is a critical utility for handling `ResultWithError` returns.

**Definition** (from `src/common/helpers/promisifier.ts`):
```typescript
export function Promisify<T>(req: Promise<ResultWithError>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const { data: result, error } = await req;
      if (error) throw error;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
```

**Purpose**: Converts `ResultWithError` pattern into standard Promise resolve/reject pattern.

**Usage Pattern**: All service and repository calls should be wrapped with `Promisify()`:
```typescript
const result = await Promisify<T>(this.service.method());
```

**Benefits**:
- Provides type-safe unwrapping of results
- Automatically throws errors for catch blocks
- Eliminates manual error checking: `if (error) throw error`
- Enables clean async/await syntax

**Convention**: Always use `Promisify()` when:
- Calling repository service methods
- Calling business service methods that return `ResultWithError`
- You need to unwrap data and handle errors via try-catch

**Type Safety**: Specify the expected return type:
```typescript
const transaction = await Promisify<Transaction>(...);
const result = await Promisify<boolean>(...);
const data = await Promisify<any>(...);
```

---

## Logging

### Winston Logger

- Inject Winston logger via `@Inject(WINSTON_MODULE_PROVIDER)`
- Logger is configured at application level in module imports
- Logs are written to console and files (`logs/error.log`, `logs/warnings.log`)

### Logging Conventions

```typescript
this.logger.info(`Operation description [data : ${JSON.stringify(input)}]`);
this.logger.error(`Error description [data : ${JSON.stringify(input)}] : ${error.stack}`);
this.logger.warn(`Warning description`);
```

**Patterns:**
- Use `info` for successful operations
- Use `error` for failures (include `error.stack`)
- Use `warn` for warnings
- Include relevant data in log messages using `JSON.stringify()`
- Use descriptive messages with context
- Log at the start and end of significant operations

---

## Testing

### Test Organization

- E2E tests located in `test/` directory
- Test files use `.spec.ts` extension
- Jest is used as the testing framework

### Jest Configuration

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

### Test Scripts

- `npm run test`: Run unit tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:cov`: Generate coverage report
- `npm run test:e2e`: Run end-to-end tests

---

## Dependencies

### Production Dependencies

- **Core**: `@nestjs/*` packages for framework
- **Database**: `typeorm`, `pg` for PostgreSQL
- **Queue**: `bull` for Redis-based queues
- **Validation**: `class-validator`, `class-transformer`
- **Logging**: `winston`, `nest-winston`
- **Blockchain**: `ethers` v6.x
- **Authentication**: `@nestjs/jwt`, `@nestjs/passport`, `jsonwebtoken`
- **Documentation**: `@nestjs/swagger`, `swagger-ui-express`
- **Scheduling**: `@nestjs/schedule`, `cron`
- **HTTP**: `@nestjs/axios`, `axios`

### Development Dependencies

- **TypeScript**: v5.x with ES2017 target
- **Linting**: ESLint with TypeScript parser
- **Formatting**: Prettier
- **Testing**: Jest with ts-jest

### Version Management

- Use exact versions or caret ranges (`^`) for dependencies
- Keep NestJS packages aligned to same major version
- Update dependencies carefully, test thoroughly

---

## Asynchronous Task Processing

### Overview

Time-consuming tasks are offloaded to the **Indexer** application to prevent blocking the API server. This is achieved through a Redis-backed queue system using Bull.

### Task Flow Architecture

```
API Server / Event Source
    ↓
  Queue (Redis)
    ↓
  Consumer
    ↓
Observer Service
    ↓
Business Logic Execution
```

### Step-by-Step Process

#### 1. **Task Creation (Producer)**

When a time-consuming task needs to be executed (e.g., sending blockchain transaction), add it to a queue:

```typescript
// In API server or event listener
await this.logsQueue.add(
  QUEUE_JOB_NAMES.PONG_TRANSACTION,
  { data: eventData },
  { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
);
```

**Key Points**:
- Inject queue with `@InjectQueue(QueueNames.XXX)`
- Use predefined job names from `QUEUE_JOB_NAMES` constants
- Configure retry attempts and backoff strategy
- Pass data as job payload

#### 2. **Task Consumption (Consumer)**

Consumers run in the **Indexer** application and listen for jobs on specific queues:

```typescript
// src/observer/consumers/log.consumer.ts
@Processor(QueueNames.NEW_LOGS)
export class LogConsumer {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private logObserverService: LogObserverService,
  ) {}

  @Process(QUEUE_JOB_NAMES.PONG_TRANSACTION)
  async handleSendPongTransaction(job: Job) {
    try {
      this.logger.info(`Processing send pong [jobId : ${job.id}]`);
      job.progress(0);

      const { error } = await this.logObserverService.handleSendPong(
        job.data.data,
      );

      if (error) {
        await job.moveToFailed(error);
      }
      job.progress(100);
    } catch (error) {
      this.logger.error(`Error in processing job: ${error.stack}`);
    }
  }

  @OnQueueFailed()
  async handleFailedJobs(job: Job, err: Error) {
    if (job.attemptsMade < job.opts.attempts) {
      await job.retry();
    }
  }
}
```

**Key Points**:
- Use `@Processor(QueueNames.XXX)` decorator to bind consumer to queue
- Use `@Process(QUEUE_JOB_NAMES.XXX)` for specific job handlers
- Inject observer service to delegate business logic
- Track job progress with `job.progress()`
- Handle failures with `@OnQueueFailed()` and retry logic
- Log all processing steps

#### 3. **Business Logic Execution (Observer Service)**

Observer services contain the actual business logic for processing tasks:

```typescript
// src/observer/services/log-observer.service.ts
@Injectable()
export class LogObserverService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private rpcService: RpcService,
    private transactionRepo: TransactionRepoService,
  ) {}

  async handleSendPong(data: BASE_EVENT_DATA): Promise<{ error }> {
    try {
      this.logger.info(`Processing send pong [data : ${JSON.stringify(data)}]`);

      // 1. Fetch current state
      const transaction = await Promisify<Transaction>(
        this.transactionRepo.get({ where: { TxHash: data.txHash } }),
      );

      // 2. Validate state
      if (transaction.TxState === TX_STATE_TYPE.PONG_CONFIRMED) {
        throw new Error('pong already confirmed');
      }

      // 3. Update state
      const { error } = await this.transactionRepo.update(
        { TxHash: data.txHash },
        { TxState: TX_STATE_TYPE.PONGING },
      );
      if (error) throw error;

      // 4. Execute time-consuming operation
      const { error: sendPongError } = await this.rpcService.handleSendPong(data);
      if (sendPongError) throw sendPongError;

      return { error: null };
    } catch (error) {
      this.logger.error(`Error in processing: ${error.stack}`);
      return { error };
    }
  }
}
```

**Key Points**:
- Observer services are injected into consumers
- Contain complex business logic (database operations, RPC calls, etc.)
- Use `Promisify()` to unwrap repository results
- Follow `ResultWithError` return pattern
- Perform validation before executing expensive operations
- Log all steps and errors

### Queue Configuration

**Queue Names** (defined in `src/common/constants.ts`):
```typescript
export const QueueNames = {
  NEW_LOGS: 'new-logs',      // Handle web3 interaction logs
  LATE_LOGS: 'late-logs',    // Handle late log web3 interactions
};
```

**Job Names**:
```typescript
export const QUEUE_JOB_NAMES = {
  PONG_TRANSACTION: 'pong-queue',
  LATE_PONG_TRANSACTION: 'late-pong-queue',
};
```

### When to Use Queues

Use the queue system for:
- **Blockchain transactions**: Sending transactions to the network
- **RPC calls**: Heavy web3 provider interactions
- **Long-running computations**: Complex data processing
- **Retry-able operations**: Tasks that may fail and need retries
- **Background jobs**: Tasks that don't need immediate response

**Don't use queues for**:
- Simple database reads
- Quick validation operations
- Operations requiring immediate synchronous response

### Naming Conventions

- **Consumers**: `{purpose}.consumer.ts` (e.g., `log.consumer.ts`)
- **Observer Services**: `{purpose}-observer.service.ts` (e.g., `log-observer.service.ts`)
- **Queue Names**: kebab-case strings (e.g., `'new-logs'`)
- **Job Names**: kebab-case strings (e.g., `'pong-queue'`)

---

## Additional Patterns

### Constants

- Define all constants in `src/common/constants.ts`
- Export objects for grouped constants: `QueueNames`, `QUEUE_JOB_NAMES`, `CRON_JOB_NAMES`
- Use enums for type-safe constants with fixed values
- Create companion array for Swagger enum documentation: `TX_EVENT_TYPE_ENUM`

### Queue Jobs

- Define queue names in constants
- Use Bull queues for background processing
- Inject queues with `@InjectQueue(QueueNames.XXX)`
- Create consumer classes in `consumers/` directory

### Cron Jobs

- Use `@nestjs/schedule` for cron jobs
- Define cron job names in constants
- Use `CronExpression` enum for common patterns
- Allow dynamic start/stop via admin endpoints

### Configuration

- Use `@nestjs/config` for configuration management
- Store configuration in `config/configuration.ts`
- Use `ConfigModule.forRoot({ load: [configuration], isGlobal: true })`
- Access config via `ConfigService` injection

### Environment Variables

- Store environment-specific values in `env/` directory
- Use `dotenv` package for loading
- Configure dotenv options in `config/dotenv-options.ts`

---

## Scripts and Commands

### Development

```bash
npm run start:dev          # Start API server in dev mode
npm run indexer:dev        # Start indexer in dev mode
```

### Production

```bash
npm run start:prod         # Start API server in production
npm run indexer:prod       # Start indexer in production
```

### Build

```bash
npm run build              # Build both applications
```

### Linting and Formatting

```bash
npm run lint               # Lint with auto-fix
npm run format             # Format code with Prettier
```

### Memory Management

- Use `NODE_OPTIONS=--max_old_space_size=4096` for memory-intensive operations
- Applied to build, dev, lint, and test scripts

---

## Documentation

### Code Comments

- Use JSDoc comments for public APIs
- Keep comments concise and meaningful
- Avoid obvious comments
- Document complex business logic

### README

- Maintain comprehensive README.md
- Include setup instructions
- Document environment variables
- Explain architecture and components

### API Documentation

- Swagger automatically generated from decorators
- Access at `/api` endpoint (typically)
- Keep decorators up-to-date

---

## Git Conventions

### Pull Request Template

- Use provided template in `pull_request_template.md`
- Include description, changes, testing details

### Commit Messages

- Use descriptive commit messages
- Reference issue numbers when applicable

---

## Summary

This document captures the coding standards and patterns consistently used throughout the PingPongIndexer codebase. When contributing to the project, follow these conventions to maintain consistency and code quality. If you identify patterns not documented here, please update this document accordingly.

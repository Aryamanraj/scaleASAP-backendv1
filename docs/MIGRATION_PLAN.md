# 🚀 Frontend-v1 → Backend-v1 Migration Plan

> **Goal**: Migrate all backend logic from frontend-v1 (Next.js) to backend-v1 (NestJS), keeping Supabase for authentication only.

**Created**: January 27, 2026  
**Status**: Planning  

---

## ⚠️ Convention Compliance

This plan MUST follow all conventions in `backend-v1/conventions.md`. Key reminders:

| Rule | Description |
|------|-------------|
| **Repo Services** | ONLY standard methods: `get`, `getAll`, `create`, `update`, `delete`, `count` |
| **Custom Queries** | All custom/specific query logic goes in **service layer**, NOT repos |
| **ResultWithError** | All service methods return `Promise<ResultWithError>` |
| **Promisify** | Always use `Promisify<T>()` to unwrap `ResultWithError` - NEVER manually destructure |
| **Relations** | Use object syntax `{ Project: true }` NOT array syntax `['Project']` |
| **Error Handling** | Services: try-catch returning `{ data, error }`. Controllers: use `Promisify` + `makeResponse` |
| **Entity Columns** | PascalCase, `@ApiProperty()` on all columns, explicit types |
| **Logging** | Inject Winston, log all operations with context |
| **Env/Config** | New secrets → add to `config/configuration.ts` AND `.env.sample` with description |
| **Async Jobs** | All queue jobs MUST use AsyncJob entity for status tracking (see Phase 6) |

---

## Table of Contents

- [Overview](#overview)
- [Phase 1: Supabase Auth Integration](#phase-1-supabase-auth-integration)
- [Phase 2: Database Schema Migration](#phase-2-database-schema-migration)
- [Phase 3: Repository Services](#phase-3-repository-services)
- [Phase 4: New NestJS Modules](#phase-4-new-nestjs-modules)
- [Phase 5: AI Services Migration](#phase-5-ai-services-migration)
- [Phase 6: Queue Jobs](#phase-6-queue-jobs)
- [Phase 7: Frontend Proxy Layer](#phase-7-frontend-proxy-layer)
- [Phase 8: Data Migration](#phase-8-data-migration)
- [Phase 9: Testing & Validation](#phase-9-testing--validation)

---

## Overview

### Current State

| Component | Location | Database |
|-----------|----------|----------|
| Auth | Supabase | Supabase `auth.users` |
| Workspaces | frontend-v1 server actions | Supabase |
| Onboarding | frontend-v1 server actions | Supabase |
| Experiments | frontend-v1 server actions | Supabase |
| Campaigns | frontend-v1 server actions | Supabase |
| Leads | frontend-v1 server actions | Supabase |
| Discovery AI | frontend-v1 API routes | - |
| Outreach AI | frontend-v1 lib | - |

### Target State

| Component | Location | Database |
|-----------|----------|----------|
| Auth | Supabase (unchanged) | Supabase `auth.users` |
| All Business Logic | backend-v1 NestJS | Backend-v1 PostgreSQL |
| Frontend | Thin proxy to backend-v1 | - |

### Key Architecture Decision: Project = Workspace

Instead of creating a new `Workspace` entity, we **extend the existing `Project` entity** to serve as a workspace:

```
Frontend-v1 Concept    →    Backend-v1 Entity
─────────────────────────────────────────────
Workspace              →    Project (extended)
workspace_members      →    ProjectUsers (existing)
Supabase User          →    User + Client (auto-provisioned)
```

**Benefits:**
- Reuses existing ProjectUsers for team/member management
- Consistent with existing Person/Document model (all Project-scoped)
- Less migration complexity

**Auto-Provisioning on First Login:**
When a Supabase user first calls backend-v1, we auto-create:
1. A personal `Client` (organization) for them
2. A `User` record linked to that Client
3. (Optional) A default `Project` to get started

---

## Phase 1: Supabase Auth Integration

### 1.1 Environment Configuration

- [ ] **Get Supabase JWT Secret**
  - Go to Supabase Dashboard → Settings → API → JWT Secret
  - Copy the secret

- [ ] **Add to backend-v1 config**
  ```bash
  # Add to backend-v1/env/.env (or your env file)
  SUPABASE_JWT_SECRET=your-jwt-secret-here
  SUPABASE_URL=https://your-project.supabase.co
  ```

- [ ] **Update config/configuration.ts**
  ```typescript
  supabase: {
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    url: process.env.SUPABASE_URL,
  },
  ```

### 1.2 Create Supabase JWT Interface

- [ ] **Update `src/common/interfaces/index.ts`**
  ```typescript
  export interface SupabaseJwtPayload {
    aud: string;
    exp: number;
    iat: number;
    iss: string;
    sub: string;                    // Supabase User ID (UUID)
    email: string;
    phone: string;
    role: string;                   // "authenticated" | "anon"
    app_metadata: {
      provider?: string;
      providers?: string[];
    };
    user_metadata: Record<string, any>;
    session_id: string;
  }
  ```

### 1.3 Update User Entity

- [ ] **Add SupabaseUserID to `src/repo/entities/user.entity.ts`**
  ```typescript
  @Column({ length: 255, unique: true, nullable: true })
  @Index('IDX_USER_SUPABASE_ID')
  SupabaseUserID: string;
  ```

- [ ] **Create migration for new column**
  ```sql
  -- migrations/YYYYMMDD_add_supabase_user_id.sql
  ALTER TABLE "Users" ADD COLUMN "SupabaseUserID" VARCHAR(255) UNIQUE;
  CREATE INDEX "IDX_USER_SUPABASE_ID" ON "Users" ("SupabaseUserID");
  ```

### 1.4 Create Supabase Auth Guard

- [ ] **Create `src/auth/guards/supabase-auth.guard.ts`**
  ```typescript
  @Injectable()
  export class SupabaseAuthGuard implements CanActivate {
    private supabaseJwtSecret: string;

    constructor(
      @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
      private configService: ConfigService,
      private userRepo: UserRepoService,
      private clientRepo: ClientRepoService,
    ) {
      this.supabaseJwtSecret = this.configService.get<string>('supabase.jwtSecret');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest();
      
      try {
        const token = this.extractToken(req);
        if (!token) throw new UnauthorizedException('No token provided');

        const payload = jwt.verify(token, this.supabaseJwtSecret) as SupabaseJwtPayload;
        
        if (payload.role !== 'authenticated') {
          throw new UnauthorizedException('User not authenticated');
        }

        const user = await this.getOrCreateUser(payload);
        
        req.user = user;
        req.userId = user.UserID;
        req.clientId = user.ClientID;
        req.supabaseUserId = payload.sub;
        
        return true;
      } catch (error) {
        this.logger.error(`SupabaseAuthGuard: Failed [error=${error.message}]`);
        throw new UnauthorizedException(error.message);
      }
    }

    private extractToken(req: any): string | null {
      const [type, token] = req.headers?.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : null;
    }

    private async getOrCreateUser(payload: SupabaseJwtPayload): Promise<User> {
      // Try to get existing user - use try-catch since panic=false returns null data
      try {
        const user = await Promisify<User>(
          this.userRepo.get(
            { where: { SupabaseUserID: payload.sub } },
            false,  // panic=false means no error thrown if not found
          ),
        );
        if (user) return user;
      } catch {
        // User not found - fall through to auto-provisioning
      }

      // ═══════════════════════════════════════════════════════════════
      // AUTO-PROVISIONING: First-time Supabase user
      // ═══════════════════════════════════════════════════════════════
      
      this.logger.info(`SupabaseAuthGuard: Auto-provisioning user [sub=${payload.sub}, email=${payload.email}]`);
      
      // 1. Create personal Client (organization) for this user
      const client = await Promisify<Client>(
        this.clientRepo.create({
          Name: payload.user_metadata?.full_name 
            ? `${payload.user_metadata.full_name}'s Organization`
            : `${payload.email?.split('@')[0]}'s Organization`,
          Slug: this.generateSlug(payload.email),
        }),
      );
      
      // 2. Create User linked to their personal Client
      const user = await Promisify<User>(
        this.userRepo.create({
          SupabaseUserID: payload.sub,
          Email: payload.email,
          Name: payload.user_metadata?.full_name || payload.email?.split('@')[0] || 'User',
          ClientID: client.ClientID,
          Role: UserRole.ADMIN,  // Admin of their own org
          Status: EntityStatus.ACTIVE,
        }),
      );

      return user;
    }
    
    private generateSlug(email: string): string {
      const base = email?.split('@')[0]?.toLowerCase() || 'user';
      const random = Math.random().toString(36).substring(2, 8);
      return `${base}-${random}`.replace(/[^a-z0-9-]/g, '-');
    }
  }
  ```

### 1.5 Environment & Config Setup

- [ ] **Add to `config/configuration.ts`**
  ```typescript
  supabase: {
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },
  ```

- [ ] **Add to `.env.sample`**
  ```bash
  # Supabase Configuration
  # The JWT secret from your Supabase project (Settings > API > JWT Secret)
  # Used to validate Supabase auth tokens in backend-v1
  SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
  ```

### 1.6 Register Guard in Auth Module

- [ ] **Update `src/auth/auth.module.ts`**
  - Import SupabaseAuthGuard
  - Add to providers array
  - Add to exports array

### 1.7 Test Auth Flow

- [ ] Create test endpoint to verify Supabase JWT validation
- [ ] Test with valid Supabase token from frontend
- [ ] Test token expiration handling
- [ ] Test user creation on first login

---

## Phase 2: Database Schema Migration

### 2.1 New Enums

- [ ] **Add to `src/common/constants/entity.constants.ts`**

```typescript
// Onboarding (for Project)
export enum OnboardingStatus {
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete',
}

// Experiments
export enum ExperimentType {
  BULLSEYE = 'bullseye',
  VARIABLE_A = 'variable_a',
  VARIABLE_B = 'variable_b',
  CONTRARIAN = 'contrarian',
  LONG_SHOT = 'long_shot',
}

export enum ExperimentStatus {
  PENDING = 'pending',
  CREATING_HYPOTHESES = 'creating_hypotheses',
  FINDING_LEADS = 'finding_leads',
  PRIORITIZING_LEADS = 'prioritizing_leads',
  WARMUP_INITIATED = 'warmup_initiated',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

// Campaigns
export enum CampaignStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum ActivityType {
  CAMPAIGN_CREATED = 'campaign_created',
  DISCOVERY_STARTED = 'discovery_started',
  DISCOVERY_COMPLETED = 'discovery_completed',
  LEADS_FOUND = 'leads_found',
  LEADS_ENRICHED = 'leads_enriched',
  OUTREACH_GENERATED = 'outreach_generated',
  LEAD_CONTACTED = 'lead_contacted',
  LEAD_RESPONDED = 'lead_responded',
  MEETING_BOOKED = 'meeting_booked',
  CAMPAIGN_PAUSED = 'campaign_paused',
  CAMPAIGN_RESUMED = 'campaign_resumed',
  ERROR_OCCURRED = 'error_occurred',
}

// Leads
export enum LeadStatus {
  FOUND = 'found',
  ENRICHING = 'enriching',
  ENRICHED = 'enriched',
  DRAFTED = 'drafted',
  QUEUED = 'queued',
  SENT = 'sent',
  RESPONDED = 'responded',
}

export enum LeadOutcome {
  NO_RESPONSE = 'no_response',
  INTERESTED = 'interested',
  MEETING_BOOKED = 'meeting_booked',
  MEETING_DONE = 'meeting_done',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
  REJECTED = 'rejected',
  UNQUALIFIED = 'unqualified',
}

export enum SignalType {
  FUNDING = 'funding',
  HIRING = 'hiring',
  EXPANSION = 'expansion',
  PRODUCT_LAUNCH = 'product_launch',
  PARTNERSHIP = 'partnership',
  LEADERSHIP_CHANGE = 'leadership_change',
  NEWS_MENTION = 'news_mention',
  SOCIAL_ACTIVITY = 'social_activity',
}

// Outreach
export enum OutreachFormat {
  LINKEDIN_CONNECTION = 'linkedin_connection',
  LINKEDIN_MESSAGE = 'linkedin_message',
  LINKEDIN_INMAIL = 'linkedin_inmail',
  EMAIL_COLD = 'email_cold',
  EMAIL_WARM = 'email_warm',
}

export enum OutreachStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed',
}

// Discovery
export enum DiscoverySessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}
```

### 2.2 Extend Existing Entities

#### 2.2.1 Extend Project Entity (Project = Workspace)

- [ ] **Update `src/repo/entities/project.entity.ts`** - Add workspace fields:
  ```typescript
  @Entity({ name: 'Projects' })
  @Index(['ClientID', 'Status'])
  export class Project extends BaseEntity {
    // ═══════════════════════════════════════════════════════════════
    // EXISTING FIELDS (unchanged)
    // ═══════════════════════════════════════════════════════════════
    @PrimaryGeneratedColumn()
    ProjectID: number;

    @Column({ type: 'bigint', nullable: false })
    ClientID: number;

    @Column({ length: 255, nullable: false })
    Name: string;

    @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
    Status: ProjectStatus;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @ManyToOne(() => Client)
    @JoinColumn({ name: 'ClientID' })
    Client: Client;

    // ═══════════════════════════════════════════════════════════════
    // NEW FIELDS (workspace functionality)
    // ═══════════════════════════════════════════════════════════════
    @Column({ length: 512, nullable: true })
    Website: string;

    @Column({ length: 512, nullable: true })
    FaviconUrl: string;

    @Column({ type: 'enum', enum: OnboardingStatus, default: OnboardingStatus.INCOMPLETE })
    OnboardingStatus: OnboardingStatus;

    @Column({ type: 'jsonb', nullable: true })
    DiscoveryChatHistory: object;

    @Column({ type: 'jsonb', nullable: true })
    Settings: object;
    
    @Column({ type: 'bigint', nullable: true })
    OwnerUserID: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'OwnerUserID' })
    Owner: User;
  }
  ```

- [ ] **Create migration for Project columns**
  ```sql
  -- migrations/YYYYMMDD_extend_project_as_workspace.sql
  ALTER TABLE "Projects" ADD COLUMN "Website" VARCHAR(512);
  ALTER TABLE "Projects" ADD COLUMN "FaviconUrl" VARCHAR(512);
  ALTER TABLE "Projects" ADD COLUMN "OnboardingStatus" VARCHAR(20) DEFAULT 'incomplete';
  ALTER TABLE "Projects" ADD COLUMN "DiscoveryChatHistory" JSONB;
  ALTER TABLE "Projects" ADD COLUMN "Settings" JSONB;
  ALTER TABLE "Projects" ADD COLUMN "OwnerUserID" BIGINT REFERENCES "Users"("UserID");
  
  CREATE INDEX "IDX_PROJECT_OWNER" ON "Projects" ("OwnerUserID");
  ```

### 2.3 New Entities

Create the following entity files in `src/repo/entities/`:

> **CONVENTION REMINDER:** All entity columns MUST have:
> - `@ApiProperty()` decorator for Swagger documentation
> - PascalCase column names
> - Explicit types (e.g., `{ type: 'bigint' }`)
> - Entities below show structure; add `@ApiProperty()` to each column during implementation.

- [ ] **onboarding-data.entity.ts**
  ```typescript
  @Entity({ name: 'OnboardingData' })
  @Index(['ProjectID'], { unique: true })
  export class OnboardingData extends BaseEntity {
    @PrimaryGeneratedColumn()
    OnboardingDataID: number;

    @Column({ type: 'bigint', nullable: false, unique: true })
    ProjectID: number;  // Links to Project (workspace)

    @Column({ type: 'jsonb', nullable: false })
    Data: object;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @OneToOne(() => Project)
    @JoinColumn({ name: 'ProjectID' })
    Project: Project;
  }
  ```

- [ ] **experiment.entity.ts**
  ```typescript
  @Entity({ name: 'Experiments' })
  @Index(['ProjectID'])
  @Index(['ProjectID', 'Status'])
  export class Experiment extends BaseEntity {
    @PrimaryGeneratedColumn()
    ExperimentID: number;

    @Column({ type: 'bigint', nullable: false })
    ProjectID: number;  // Links to Project (workspace)

    @Column({ length: 255, nullable: false })
    Name: string;

    @Column({ type: 'enum', enum: ExperimentType })
    Type: ExperimentType;

    @Column({ type: 'text', nullable: true })
    Pattern: string;

    @Column({ type: 'jsonb', nullable: true })
    Industries: object;

    @Column({ type: 'text', nullable: true })
    Pain: string;

    @Column({ type: 'text', nullable: true })
    Trigger: string;

    @Column({ type: 'jsonb', nullable: true })
    WizaFilters: object;

    @Column({ type: 'text', nullable: true })
    OutreachAngle: string;

    @Column({ type: 'enum', enum: ExperimentStatus, default: ExperimentStatus.PENDING })
    Status: ExperimentStatus;

    @Column({ type: 'int', default: 0 })
    LeadsFound: number;

    @Column({ type: 'int', default: 0 })
    LeadsWarming: number;

    @Column({ type: 'int', default: 0 })
    MeetingsBooked: number;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'ProjectID' })
    Project: Project;
  }
  ```

- [ ] **campaign.entity.ts**
  ```typescript
  @Entity({ name: 'Campaigns' })
  @Index(['ProjectID'])
  @Index(['ExperimentID'])
  @Index(['ProjectID', 'Status'])
  export class Campaign extends BaseEntity {
    @PrimaryGeneratedColumn()
    CampaignID: number;

    @Column({ type: 'bigint', nullable: false })
    ProjectID: number;  // Links to Project (workspace)

    @Column({ type: 'bigint', nullable: true })
    ExperimentID: number;

    @Column({ length: 255, nullable: false })
    Name: string;

    @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.ACTIVE })
    Status: CampaignStatus;

    @Column({ type: 'jsonb', nullable: true })
    Settings: object;

    @Column({ type: 'int', default: 50 })
    DailyLeadLimit: number;

    @Column({ type: 'boolean', default: false })
    AutopilotEnabled: boolean;

    @Column({ type: 'timestamp with time zone', nullable: true })
    LastDiscoveryRun: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    NextDiscoveryRun: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    DeletedAt: Date;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'ProjectID' })
    Project: Project;

    @ManyToOne(() => Experiment)
    @JoinColumn({ name: 'ExperimentID' })
    Experiment: Experiment;
  }
  ```

- [ ] **campaign-activity.entity.ts**
  ```typescript
  @Entity({ name: 'CampaignActivities' })
  @Index(['CampaignID', 'CreatedAt'])
  export class CampaignActivity extends BaseEntity {
    @PrimaryGeneratedColumn()
    CampaignActivityID: number;

    @Column({ type: 'bigint', nullable: false })
    CampaignID: number;

    @Column({ type: 'enum', enum: ActivityType })
    ActivityType: ActivityType;

    @Column({ length: 255, nullable: false })
    Title: string;

    @Column({ type: 'text', nullable: true })
    Description: string;

    @Column({ type: 'jsonb', nullable: true })
    Metadata: object;

    @Column({ length: 50, nullable: true })
    Status: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'CampaignID' })
    Campaign: Campaign;
  }
  ```

- [ ] **lead.entity.ts**
  ```typescript
  @Entity({ name: 'Leads' })
  @Index(['CampaignID'])
  @Index(['ProjectID'])
  @Index(['ProjectID', 'Status'])
  @Index(['LinkedinUrl'])
  export class Lead extends BaseEntity {
    @PrimaryGeneratedColumn()
    LeadID: number;

    @Column({ type: 'bigint', nullable: false })
    CampaignID: number;

    @Column({ type: 'bigint', nullable: false })
    ProjectID: number;  // Links to Project (workspace)

    @Column({ type: 'bigint', nullable: true })
    PersonID: number;  // Optional link to global Person

    @Column({ length: 255, nullable: false })
    FullName: string;

    @Column({ length: 255, nullable: true })
    JobTitle: string;

    @Column({ length: 255, nullable: true })
    Company: string;

    @Column({ length: 512, nullable: true })
    LinkedinUrl: string;

    @Column({ length: 255, nullable: true })
    Email: string;

    @Column({ length: 50, nullable: true })
    Phone: string;

    @Column({ length: 255, nullable: true })
    Location: string;

    @Column({ length: 512, nullable: true })
    AvatarUrl: string;

    @Column({ type: 'text', nullable: true })
    AiSummary: string;

    @Column({ type: 'int', nullable: true })
    RelevanceScore: number;

    @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.FOUND })
    Status: LeadStatus;

    @Column({ type: 'enum', enum: LeadOutcome, nullable: true })
    Outcome: LeadOutcome;

    @Column({ type: 'text', nullable: true })
    OutcomeReason: string;

    @Column({ type: 'jsonb', nullable: true })
    RawData: object;

    @Column({ type: 'jsonb', nullable: true })
    EnrichmentData: object;

    @Column({ type: 'text', nullable: true })
    OutboundMessage: string;

    @Column({ type: 'timestamp with time zone', nullable: true })
    ContactedAt: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    RespondedAt: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'CampaignID' })
    Campaign: Campaign;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'ProjectID' })
    Project: Project;

    @ManyToOne(() => Person, { nullable: true })
    @JoinColumn({ name: 'PersonID' })
    Person: Person;
  }
  ```

- [ ] **lead-signal.entity.ts**
  ```typescript
  @Entity({ name: 'LeadSignals' })
  @Index(['LeadID'])
  export class LeadSignal extends BaseEntity {
    @PrimaryGeneratedColumn()
    LeadSignalID: number;

    @Column({ type: 'bigint', nullable: false })
    LeadID: number;

    @Column({ length: 255, nullable: false })
    Headline: string;

    @Column({ type: 'text', nullable: true })
    Description: string;

    @Column({ type: 'enum', enum: SignalType })
    SignalType: SignalType;

    @Column({ type: 'int', nullable: true })
    StrengthScore: number;

    @Column({ type: 'jsonb', nullable: true })
    Citations: object;

    @Column({ type: 'timestamp with time zone', nullable: true })
    DetectedAt: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @ManyToOne(() => Lead)
    @JoinColumn({ name: 'LeadID' })
    Lead: Lead;
  }
  ```

- [ ] **outreach-message.entity.ts**
  ```typescript
  @Entity({ name: 'OutreachMessages' })
  @Index(['LeadID'])
  @Index(['CampaignID'])
  export class OutreachMessage extends BaseEntity {
    @PrimaryGeneratedColumn()
    OutreachMessageID: number;

    @Column({ type: 'bigint', nullable: false })
    LeadID: number;

    @Column({ type: 'bigint', nullable: false })
    CampaignID: number;

    @Column({ type: 'enum', enum: OutreachFormat })
    Format: OutreachFormat;

    @Column({ type: 'boolean', default: false })
    IsFollowup: boolean;

    @Column({ type: 'int', default: 1 })
    SequenceNumber: number;

    @Column({ type: 'text', nullable: false })
    Content: string;

    @Column({ length: 255, nullable: true })
    Subject: string;

    @Column({ type: 'enum', enum: OutreachStatus, default: OutreachStatus.DRAFT })
    Status: OutreachStatus;

    @Column({ type: 'timestamp with time zone', nullable: true })
    ScheduledAt: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    SentAt: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    OpenedAt: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    RepliedAt: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @ManyToOne(() => Lead)
    @JoinColumn({ name: 'LeadID' })
    Lead: Lead;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'CampaignID' })
    Campaign: Campaign;
  }
  ```

- [ ] **discovery-session.entity.ts**
  ```typescript
  @Entity({ name: 'DiscoverySessions' })
  @Index(['ProjectID'])
  export class DiscoverySession extends BaseEntity {
    @PrimaryGeneratedColumn()
    DiscoverySessionID: number;

    @Column({ type: 'bigint', nullable: false })
    ProjectID: number;  // Links to Project (workspace)

    @Column({ type: 'jsonb', nullable: true })
    Messages: object;

    @Column({ type: 'jsonb', nullable: true })
    GeneratedIcps: object;

    @Column({ type: 'enum', enum: DiscoverySessionStatus, default: DiscoverySessionStatus.ACTIVE })
    Status: DiscoverySessionStatus;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    UpdatedAt: Date;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'ProjectID' })
    Project: Project;
  }
  ```

- [ ] **discovery-feedback.entity.ts**
  ```typescript
  @Entity({ name: 'DiscoveryFeedback' })
  @Index(['ProjectID'])
  export class DiscoveryFeedback extends BaseEntity {
    @PrimaryGeneratedColumn()
    DiscoveryFeedbackID: number;

    @Column({ type: 'bigint', nullable: false })
    ProjectID: number;  // Links to Project (workspace)

    @Column({ type: 'bigint', nullable: false })
    UserID: number;

    @Column({ type: 'int', nullable: false })
    Rating: number;

    @Column({ type: 'text', nullable: true })
    Feedback: string;

    @Column({ type: 'jsonb', nullable: true })
    ExperimentContext: object;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    CreatedAt: Date;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'ProjectID' })
    Project: Project;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'UserID' })
    User: User;
  }
  ```

### 2.4 Database Migration SQL

- [ ] **Create migration file `migrations/20260127_add_workspace_campaign_tables.sql`**
  - All CREATE TABLE statements for new entities (NOT Workspace/WorkspaceMember - we use Project/ProjectUsers)
  - All CREATE INDEX statements
  - All ENUM type creations
  - Include the Project extension migration (see 2.2.1)
  - Include the User extension migration (add SupabaseUserID column)

---

## Phase 3: Repository Services

Create repository services in `src/repo/`:

> **Note:** We do NOT create workspace-repo or workspace-member-repo. 
> Project functionality is extended in the existing `project-repo.service.ts` 
> and membership uses existing `project-user-repo.service.ts`.
>
> **CONVENTION REMINDER:** Repository services ONLY have standard methods:
> `get`, `getAll`, `create`, `update`, `delete`, `count`.
> All specific/custom query logic goes in the **service layer** (e.g., `workspace.service.ts`).

- [ ] **onboarding-data-repo.service.ts**
- [ ] **experiment-repo.service.ts**
- [ ] **campaign-repo.service.ts**
- [ ] **campaign-activity-repo.service.ts**
- [ ] **lead-repo.service.ts**
- [ ] **lead-signal-repo.service.ts**
- [ ] **outreach-message-repo.service.ts**
- [ ] **discovery-session-repo.service.ts**
- [ ] **discovery-feedback-repo.service.ts**

Each repo follows the pattern (standard methods only):
```typescript
@Injectable()
export class ExperimentRepoService {
  private repo: Repository<Experiment>;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    this.repo = entityManager.getRepository(Experiment);
  }

  // ONLY these standard methods - no custom query methods in repo!
  async get(options: FindOneOptions<Experiment>, panic = true): Promise<ResultWithError> { ... }
  async getAll(options: FindManyOptions<Experiment>, panic = true): Promise<ResultWithError> { ... }
  async create(entity: Partial<Experiment>): Promise<ResultWithError> { ... }
  async update(where: FindOptionsWhere<Experiment>, entity: Partial<Experiment>): Promise<ResultWithError> { ... }
  async delete(where: FindOptionsWhere<Experiment>): Promise<ResultWithError> { ... }
  async count(options: FindManyOptions<Experiment>): Promise<ResultWithError> { ... }
}
```

- [ ] **Register all repos in `src/repo/repo.module.ts`**

---

## Phase 4: New NestJS Modules

> **Note on Naming:** Externally, we expose "workspace" API routes for frontend compatibility.
> Internally, these map to the existing Project entity. The frontend continues to call
> `/workspaces/...` endpoints, but under the hood it's working with Projects.

### 4.1 Workspace Module (wraps Project)

- [ ] **Create `src/workspace/` directory structure**
  ```
  workspace/
  ├── workspace.module.ts
  ├── workspace.controller.ts      # Exposes /workspaces routes
  ├── workspace.service.ts         # Uses ProjectRepoService internally
  ├── dto/
  │   ├── create-workspace.dto.ts
  │   ├── update-workspace.dto.ts
  │   └── workspace-response.dto.ts
  └── guards/
      └── workspace-access.guard.ts  # Checks ProjectUsers for access
  ```

- [ ] **Endpoints to implement:**
  - `GET /workspaces` - List user's workspaces (Projects where user is member via ProjectUsers)
  - `POST /workspaces` - Create workspace (creates Project + ProjectUser for owner)
  - `GET /workspaces/:id` - Get workspace by ID (returns Project with workspace fields)
  - `PUT /workspaces/:id` - Update workspace (updates Project)
  - `DELETE /workspaces/:id` - Delete workspace (deletes Project)
  - `GET /workspaces/:id/members` - List members (from ProjectUsers)
  - `POST /workspaces/:id/members` - Add member (creates ProjectUser)

- [ ] **Internal Mapping:**
  ```typescript
  // workspace.service.ts - Custom query logic lives HERE, not in repo
  @Injectable()
  export class WorkspaceService {
    constructor(
      @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
      private userRepoService: UserRepoService,
      private projectRepoService: ProjectRepoService,
      private projectUserRepoService: ProjectUserRepoService,
    ) {}

    // Custom query methods belong in the SERVICE, not in repo
    async getWorkspacesForUser(userId: number): Promise<ResultWithError> {
      try {
        this.logger.info(`Getting workspaces for user [userId=${userId}]`);
        
        // Use repo's standard getAll with proper options
        const projectUsers = await Promisify<ProjectUser[]>(
          this.projectUserRepoService.getAll({
            where: { UserID: userId },
            relations: { Project: true },
          }, false),
        );
        
        // Map to WorkspaceResponseDto...
        return { data: projectUsers.map(pu => pu.Project), error: null };
      } catch (error) {
        this.logger.error(`Error getting workspaces: ${error.stack}`);
        return { data: null, error };
      }
    }

    async getWorkspaceByOwner(ownerUserId: number): Promise<ResultWithError> {
      try {
        this.logger.info(`Getting workspaces by owner [ownerUserId=${ownerUserId}]`);
        
        // Use repo's standard getAll - custom filtering is service responsibility
        return this.projectRepoService.getAll({
          where: { OwnerUserID: ownerUserId },
        }, false);
      } catch (error) {
        this.logger.error(`Error getting workspaces by owner: ${error.stack}`);
        return { data: null, error };
      }
    }

    async createWorkspace(userId: number, dto: CreateWorkspaceDto): Promise<ResultWithError> {
      try {
        this.logger.info(`Creating workspace [userId=${userId}, data=${JSON.stringify(dto)}]`);
        
        // 1. Get user's client via repo's standard get()
        const user = await Promisify<User>(
          this.userRepoService.get({ where: { UserID: userId } }),
        );
        
        // 2. Create Project via repo's standard create()
        const project = await Promisify<Project>(
          this.projectRepoService.create({
            ClientID: user.ClientID,
            Name: dto.name,
            Website: dto.website,
            OwnerUserID: userId,
            OnboardingStatus: OnboardingStatus.INCOMPLETE,
          }),
        );
        
        // 3. Create ProjectUser via repo's standard create()
        await Promisify<ProjectUser>(
          this.projectUserRepoService.create({
            ProjectID: project.ProjectID,
            UserID: userId,
            Role: ProjectUserRole.OWNER,
          }),
        );
        
        return { data: project, error: null };
      } catch (error) {
        this.logger.error(`Error creating workspace: ${error.stack}`);
        return { data: null, error };
      }
    }

    async updateOnboardingStatus(projectId: number, status: OnboardingStatus): Promise<ResultWithError> {
      try {
        this.logger.info(`Updating onboarding status [projectId=${projectId}, status=${status}]`);
        
        // Use repo's standard update() method
        return this.projectRepoService.update(
          { ProjectID: projectId },
          { OnboardingStatus: status },
        );
      } catch (error) {
        this.logger.error(`Error updating onboarding status: ${error.stack}`);
        return { data: null, error };
      }
    }
  }
  }
  ```

### 4.2 Onboarding Module

- [ ] **Create `src/onboarding/` directory structure**
  ```
  onboarding/
  ├── onboarding.module.ts
  ├── onboarding.controller.ts
  ├── onboarding.service.ts
  └── dto/
      ├── save-onboarding.dto.ts
      └── onboarding-response.dto.ts
  ```

- [ ] **Endpoints to implement:**
  - `GET /workspaces/:id/onboarding` - Get onboarding data
  - `PUT /workspaces/:id/onboarding` - Save onboarding data

### 4.3 Experiment Module

- [ ] **Create `src/experiment/` directory structure**
  ```
  experiment/
  ├── experiment.module.ts
  ├── experiment.controller.ts
  ├── experiment.service.ts
  └── dto/
      ├── create-experiment.dto.ts
      ├── create-experiments-batch.dto.ts
      └── update-experiment.dto.ts
  ```

- [ ] **Endpoints to implement:**
  - `GET /workspaces/:id/experiments` - List experiments
  - `POST /workspaces/:id/experiments` - Create experiments (batch)
  - `PUT /experiments/:id` - Update experiment
  - `DELETE /experiments/:id` - Delete experiment

### 4.4 Campaign Module

- [ ] **Create `src/campaign/` directory structure**
  ```
  campaign/
  ├── campaign.module.ts
  ├── campaign.controller.ts
  ├── campaign.service.ts
  └── dto/
      ├── create-campaign.dto.ts
      ├── update-campaign.dto.ts
      └── campaign-response.dto.ts
  ```

- [ ] **Endpoints to implement:**
  - `GET /workspaces/:id/campaigns` - List campaigns
  - `POST /campaigns` - Create campaign
  - `GET /campaigns/:id` - Get campaign with stats
  - `PUT /campaigns/:id` - Update campaign
  - `DELETE /campaigns/:id` - Soft delete
  - `POST /campaigns/:id/scale` - Scale campaign
  - `GET /campaigns/:id/activities` - Activity feed

### 4.5 Lead Module

- [ ] **Create `src/lead/` directory structure**
  ```
  lead/
  ├── lead.module.ts
  ├── lead.controller.ts
  ├── lead.service.ts
  └── dto/
      ├── create-lead.dto.ts
      ├── create-leads-batch.dto.ts
      ├── update-lead.dto.ts
      └── log-outcome.dto.ts
  ```

- [ ] **Endpoints to implement:**
  - `GET /campaigns/:id/leads` - List leads for campaign
  - `GET /workspaces/:id/leads` - All workspace leads
  - `POST /campaigns/:id/leads` - Add leads (batch)
  - `GET /leads/:id` - Get lead detail
  - `PUT /leads/:id` - Update lead
  - `POST /leads/:id/outcome` - Log outcome
  - `POST /leads/:id/generate-outreach` - Generate outreach

### 4.6 Discovery Module

- [ ] **Create `src/discovery/` directory structure**
  ```
  discovery/
  ├── discovery.module.ts
  ├── discovery.controller.ts
  ├── discovery.service.ts
  ├── prompts/
  │   ├── orchestrator.ts
  │   ├── strategy.ts
  │   ├── style.ts
  │   └── output.ts
  └── dto/
      ├── discovery-chat.dto.ts
      └── discovery-feedback.dto.ts
  ```

- [ ] **Endpoints to implement:**
  - `POST /workspaces/:id/discovery/chat` - Chat (streaming)
  - `GET /workspaces/:id/discovery/history` - Get history
  - `POST /workspaces/:id/discovery/feedback` - Save feedback

### 4.7 Outreach Module

- [ ] **Create `src/outreach/` directory structure**
  ```
  outreach/
  ├── outreach.module.ts
  ├── outreach.controller.ts
  ├── outreach.service.ts
  ├── content-engine.service.ts
  └── prompts/
      └── outreach.prompt.ts
  ```

- [ ] **Endpoints to implement:**
  - `POST /leads/:id/generate-outreach` - Generate message
  - `GET /leads/:id/outreach` - Get outreach history

### 4.8 Scraper Module Enhancement

- [ ] **Add website scraper to existing `src/scraper/`**
  - `website-scraper.service.ts` - Scrape + AI clean websites
  - Endpoint: `POST /scrape/website`

### 4.9 Wiza Integration Module

- [ ] **Environment & Config Setup (Wiza)**
  
  Add to `config/configuration.ts`:
  ```typescript
  wiza: {
    apiKey: process.env.WIZA_API_KEY,
    baseUrl: process.env.WIZA_BASE_URL || 'https://wiza.co/api/v2',
  },
  ```
  
  Add to `.env.sample`:
  ```bash
  # Wiza Configuration
  # Wiza API key for lead enrichment and search
  WIZA_API_KEY=your-wiza-api-key-here
  WIZA_BASE_URL=https://wiza.co/api/v2  # Optional, defaults to production URL
  ```

- [ ] **Create `src/wiza/` directory structure**
  ```
  wiza/
  ├── wiza.module.ts
  ├── wiza.service.ts
  ├── filter-optimizer.service.ts
  └── dto/
      └── wiza-filters.dto.ts
  ```

- [ ] **Endpoints to implement:**
  - `POST /filters/optimize` - Optimize Wiza filters
  - `POST /filters/regenerate` - Regenerate filters

---

## Phase 5: AI Services Migration

### 5.0 Environment & Config Setup (AI)

- [ ] **Add to `config/configuration.ts`**
  ```typescript
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    },
  },
  ```

- [ ] **Add to `.env.sample`**
  ```bash
  # AI Provider Configuration
  # OpenAI API key for GPT models (discovery chat, outreach generation)
  OPENAI_API_KEY=sk-your-openai-api-key-here
  OPENAI_MODEL=gpt-4o  # Optional, defaults to gpt-4o
  
  # Google Gemini API key (fallback when OpenAI rate limited)
  GEMINI_API_KEY=your-gemini-api-key-here
  GEMINI_MODEL=gemini-1.5-pro  # Optional, defaults to gemini-1.5-pro
  ```

### 5.1 AI Provider Enhancement

- [ ] **Update `src/ai/ai-provider.service.ts`**
  - Add OpenAI streaming support
  - Add Gemini fallback (rate limit handling)
  - Add sanitization for destructive commands

### 5.2 Migrate Prompts

- [ ] **Create `src/ai/prompts/` directory**
  - Copy from `frontend-v1/lib/prompts/discovery/`
  - Copy from `frontend-v1/lib/content-engine/prompt.ts`

- [ ] **Prompts to migrate:**
  - `discovery/orchestrator.ts`
  - `discovery/strategy.ts`
  - `discovery/style.ts`
  - `discovery/output.ts`
  - `discovery/execution.ts`
  - `discovery/followup.ts`
  - `outreach/system.ts`
  - `scrape/cleanup.ts`

### 5.3 Discovery AI Service

- [ ] **Create `src/ai/services/discovery-ai.service.ts`**
  - Implement `getDiscoverySystemPrompt()`
  - Implement `parseExperimentsFromResponse()`
  - Handle streaming chat completion

### 5.4 Outreach AI Service

- [ ] **Create `src/ai/services/outreach-ai.service.ts`**
  - Implement `generateOutreach()`
  - Implement `analyzeLinkedInActivity()`

---

## Phase 6: Queue Jobs & Async Task Tracking (Redis-Native)

> **Note:** We use Bull's native Redis storage for job state instead of a separate DB table.
> Benefits: Faster reads/writes, no extra DB load, automatic TTL cleanup, simpler architecture.

### 6.1 Job Data Interface & Enums

- [ ] **Add enums to `src/common/constants/entity.constants.ts`**
  ```typescript
  export enum AsyncJobType {
    DISCOVERY_CHAT = 'discovery_chat',
    GENERATE_EXPERIMENTS = 'generate_experiments',
    LEAD_ENRICHMENT = 'lead_enrichment',
    BULK_LEAD_ENRICHMENT = 'bulk_lead_enrichment',
    GENERATE_OUTREACH = 'generate_outreach',
    BULK_GENERATE_OUTREACH = 'bulk_generate_outreach',
    WEBSITE_SCRAPE = 'website_scrape',
    CAMPAIGN_SCALE = 'campaign_scale',
    DATA_EXPORT = 'data_export',
    WIZA_SEARCH = 'wiza_search',
  }
  ```

- [ ] **Create `src/async-job/interfaces/job-data.interface.ts`**
  ```typescript
  // Base interface for all async job data stored in Redis
  export interface BaseJobData {
    projectId: number;
    userId: number;
    jobType: AsyncJobType;
    // Progress tracking fields (stored in job.data, updated via job.updateData())
    totalSteps: number;
    completedSteps: number;
    currentStep: string;
    startedAt?: string;  // ISO string
    // Result fields (populated on completion/failure)
    output?: object;
    errorMessage?: string;
    errorDetails?: object;
  }

  // Specific job data interfaces
  export interface LeadEnrichmentJobData extends BaseJobData {
    leadIds: number[];
  }

  export interface DiscoveryChatJobData extends BaseJobData {
    conversationId: string;
    messages: any[];
  }

  export interface OutreachJobData extends BaseJobData {
    leadIds: number[];
    templateId?: number;
  }

  export interface WebsiteScrapeJobData extends BaseJobData {
    url: string;
    depth?: number;
  }
  ```

### 6.2 Async Job Service (Redis-Native via Bull)

- [ ] **Create `src/async-job/async-job.service.ts`**
  ```typescript
  import { Queue, Job, JobStatus } from 'bull';
  
  @Injectable()
  export class AsyncJobService {
    private queues: Map<string, Queue> = new Map();

    constructor(
      @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
      @InjectQueue(QueueNames.DISCOVERY) private discoveryQueue: Queue,
      @InjectQueue(QueueNames.OUTREACH) private outreachQueue: Queue,
      @InjectQueue(QueueNames.LEAD_ENRICHMENT) private leadEnrichmentQueue: Queue,
      @InjectQueue(QueueNames.WEBSITE_SCRAPER) private websiteScraperQueue: Queue,
    ) {
      // Register queues for lookup by job type
      this.queues.set(AsyncJobType.DISCOVERY_CHAT, this.discoveryQueue);
      this.queues.set(AsyncJobType.GENERATE_EXPERIMENTS, this.discoveryQueue);
      this.queues.set(AsyncJobType.LEAD_ENRICHMENT, this.leadEnrichmentQueue);
      this.queues.set(AsyncJobType.BULK_LEAD_ENRICHMENT, this.leadEnrichmentQueue);
      this.queues.set(AsyncJobType.GENERATE_OUTREACH, this.outreachQueue);
      this.queues.set(AsyncJobType.BULK_GENERATE_OUTREACH, this.outreachQueue);
      this.queues.set(AsyncJobType.WEBSITE_SCRAPE, this.websiteScraperQueue);
    }

    /**
     * Get job status directly from Redis via Bull
     */
    async getJobStatus(jobId: string, jobType: AsyncJobType): Promise<ResultWithError> {
      try {
        const queue = this.queues.get(jobType);
        if (!queue) {
          return { data: null, error: new Error(`Unknown job type: ${jobType}`) };
        }

        const job = await queue.getJob(jobId);
        if (!job) {
          return { data: null, error: new Error(`Job not found: ${jobId}`) };
        }

        const state = await job.getState();
        const progress = job.progress();

        return {
          data: {
            jobId: job.id.toString(),
            jobType: job.data.jobType,
            status: this.mapBullStateToStatus(state),
            progress: typeof progress === 'number' ? progress : progress?.percentage || 0,
            totalSteps: job.data.totalSteps || 0,
            completedSteps: job.data.completedSteps || 0,
            currentStep: job.data.currentStep || this.getDefaultStepText(state),
            output: job.data.output || null,
            errorMessage: job.data.errorMessage || (job.failedReason ? job.failedReason : null),
            createdAt: new Date(job.timestamp),
            startedAt: job.processedOn ? new Date(job.processedOn) : null,
            completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
          },
          error: null,
        };
      } catch (error) {
        this.logger.error(`Error getting job status: ${error.stack}`);
        return { data: null, error };
      }
    }

    /**
     * Get all jobs for a project (searches across all queues)
     */
    async getJobsForProject(projectId: number, status?: string): Promise<ResultWithError> {
      try {
        const allJobs: any[] = [];

        for (const [jobType, queue] of this.queues.entries()) {
          // Get jobs by status (Bull stores them separately)
          const states: JobStatus[] = status 
            ? [this.mapStatusToBullState(status)]
            : ['waiting', 'active', 'completed', 'failed', 'delayed'];

          for (const state of states) {
            const jobs = await queue.getJobs([state], 0, 50);
            
            // Filter by projectId (stored in job.data)
            const projectJobs = jobs.filter(j => j.data.projectId === projectId);
            
            for (const job of projectJobs) {
              const jobState = await job.getState();
              allJobs.push({
                jobId: job.id.toString(),
                jobType: job.data.jobType,
                status: this.mapBullStateToStatus(jobState),
                progress: job.progress(),
                currentStep: job.data.currentStep,
                createdAt: new Date(job.timestamp),
              });
            }
          }
        }

        // Sort by createdAt descending
        allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return { data: allJobs.slice(0, 50), error: null };
      } catch (error) {
        this.logger.error(`Error getting jobs for project: ${error.stack}`);
        return { data: null, error };
      }
    }

    /**
     * Cancel a job if still in cancellable state
     */
    async cancelJob(jobId: string, jobType: AsyncJobType): Promise<ResultWithError> {
      try {
        const queue = this.queues.get(jobType);
        if (!queue) {
          return { data: null, error: new Error(`Unknown job type: ${jobType}`) };
        }

        const job = await queue.getJob(jobId);
        if (!job) {
          return { data: null, error: new Error(`Job not found: ${jobId}`) };
        }

        const state = await job.getState();
        if (state === 'completed' || state === 'failed') {
          return { data: false, error: new Error('Cannot cancel completed/failed job') };
        }

        await job.remove();
        this.logger.info(`Job cancelled [jobId=${jobId}]`);
        
        return { data: true, error: null };
      } catch (error) {
        this.logger.error(`Error cancelling job: ${error.stack}`);
        return { data: null, error };
      }
    }

    private mapBullStateToStatus(state: string): string {
      switch (state) {
        case 'waiting':
        case 'delayed': return 'queued';
        case 'active': return 'processing';
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        default: return 'pending';
      }
    }

    private mapStatusToBullState(status: string): JobStatus {
      switch (status) {
        case 'queued':
        case 'pending': return 'waiting';
        case 'processing': return 'active';
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        default: return 'waiting';
      }
    }

    private getDefaultStepText(state: string): string {
      switch (state) {
        case 'waiting':
        case 'delayed': return 'Queued for processing...';
        case 'active': return 'Processing...';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        default: return 'Waiting to start...';
      }
    }
  }
  ```

### 6.3 Job Step Definitions (for % calculation)

Each job type defines its steps for accurate percentage tracking:

- [ ] **Add to `src/async-job/job-steps.constants.ts`**
  ```typescript
  // Step definitions for each async job type
  // Used to calculate accurate progress percentages
  
  export const JOB_STEPS = {
    [AsyncJobType.DISCOVERY_CHAT]: {
      steps: [
        'Analyzing company context',
        'Generating ICP hypotheses',
        'Refining target personas',
        'Creating experiment recommendations',
        'Finalizing response',
      ],
      totalSteps: 5,
    },
    
    [AsyncJobType.GENERATE_EXPERIMENTS]: {
      steps: [
        'Parsing discovery output',
        'Validating ICP patterns',
        'Generating Wiza filters',
        'Creating experiment records',
        'Saving to database',
      ],
      totalSteps: 5,
    },
    
    [AsyncJobType.LEAD_ENRICHMENT]: {
      steps: ['Fetching from Wiza', 'Parsing profile data', 'Saving enrichment'],
      totalSteps: 3,
    },
    
    [AsyncJobType.BULK_LEAD_ENRICHMENT]: {
      // Dynamic: totalSteps = leadIds.length
      dynamic: true,
    },
    
    [AsyncJobType.GENERATE_OUTREACH]: {
      steps: [
        'Analyzing lead profile',
        'Fetching company context',
        'Generating personalized message',
        'Applying style guidelines',
        'Finalizing draft',
      ],
      totalSteps: 5,
    },
    
    [AsyncJobType.BULK_GENERATE_OUTREACH]: {
      // Dynamic: totalSteps = leadIds.length
      dynamic: true,
    },
    
    [AsyncJobType.WEBSITE_SCRAPE]: {
      steps: [
        'Fetching page content',
        'Extracting text',
        'AI cleanup & summarization',
        'Saving results',
      ],
      totalSteps: 4,
    },
    
    [AsyncJobType.CAMPAIGN_SCALE]: {
      steps: [
        'Analyzing current performance',
        'Calculating optimal scale',
        'Finding new leads',
        'Enriching leads',
        'Generating outreach',
        'Activating scaled campaign',
      ],
      totalSteps: 6,
    },
    
    [AsyncJobType.WIZA_SEARCH]: {
      steps: [
        'Validating filters',
        'Submitting search request',
        'Polling for results',
        'Parsing lead data',
        'Saving leads',
      ],
      totalSteps: 5,
    },
    
    [AsyncJobType.DATA_EXPORT]: {
      // Dynamic: depends on record count
      dynamic: true,
    },
  };
  ```

### 6.4 Async Job Response DTO (with % done)

- [ ] **Create `src/async-job/dto/async-job-response.dto.ts`**
  ```typescript
  export class AsyncJobResponseDto {
    @ApiProperty({ description: 'Unique job identifier (Bull job ID)' })
    jobId: string;

    @ApiProperty({ enum: AsyncJobType, description: 'Type of async job' })
    jobType: AsyncJobType;

    @ApiProperty({ description: 'Current job status: pending | queued | processing | completed | failed' })
    status: string;

    @ApiProperty({ description: 'Progress percentage (0-100)', example: 75 })
    progress: number;

    @ApiProperty({ description: 'Formatted progress string', example: '75% complete' })
    progressText: string;

    @ApiProperty({ description: 'Number of completed steps', example: 3 })
    completedSteps: number;

    @ApiProperty({ description: 'Total number of steps', example: 4 })
    totalSteps: number;

    @ApiProperty({ description: 'Current step description', example: 'Enriching lead 3 of 4' })
    currentStep: string;

    @ApiProperty({ description: 'Estimated time remaining in seconds', nullable: true })
    estimatedSecondsRemaining: number | null;

    @ApiProperty({ description: 'Job output data (when completed)', nullable: true })
    output: object | null;

    @ApiProperty({ description: 'Error message (when failed)', nullable: true })
    errorMessage: string | null;

    @ApiProperty({ description: 'Job creation timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Job start timestamp', nullable: true })
    startedAt: Date | null;

    @ApiProperty({ description: 'Job completion timestamp', nullable: true })
    completedAt: Date | null;
  }
  ```

- [ ] **Add mapper method in AsyncJobService**
  ```typescript
  toResponseDto(jobData: any): AsyncJobResponseDto {
    const elapsedSeconds = jobData.startedAt 
      ? (Date.now() - new Date(jobData.startedAt).getTime()) / 1000 
      : 0;
    
    // Estimate remaining time based on progress rate
    let estimatedSecondsRemaining: number | null = null;
    if (jobData.progress > 0 && jobData.progress < 100 && elapsedSeconds > 0) {
      const secondsPerPercent = elapsedSeconds / jobData.progress;
      estimatedSecondsRemaining = Math.round(secondsPerPercent * (100 - jobData.progress));
    }

    return {
      jobId: jobData.jobId,
      jobType: jobData.jobType,
      status: jobData.status,
      progress: jobData.progress,
      progressText: `${jobData.progress}% complete`,
      completedSteps: jobData.completedSteps,
      totalSteps: jobData.totalSteps,
      currentStep: jobData.currentStep,
      estimatedSecondsRemaining,
      output: jobData.output,
      errorMessage: jobData.errorMessage,
      createdAt: jobData.createdAt,
      startedAt: jobData.startedAt,
      completedAt: jobData.completedAt,
    };
  }
  ```

### 6.5 Async Job Controller

- [ ] **Create `src/async-job/async-job.controller.ts`**
  ```typescript
  @Controller('jobs')
  @ApiTags('Async Jobs')
  @ApiBearerAuth('Api-auth')
  @UseGuards(SupabaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  export class AsyncJobController {
    constructor(private asyncJobService: AsyncJobService) {}

    @Get(':jobId')
    @ApiOkResponseGeneric({ type: AsyncJobResponseDto, description: 'Get job status from Redis' })
    @ApiQuery({ name: 'jobType', enum: AsyncJobType, required: true })
    async getJobStatus(
      @Param('jobId') jobId: string,
      @Query('jobType') jobType: AsyncJobType,
      @Res() res: Response,
    ) {
      const result = await Promisify<any>(
        this.asyncJobService.getJobStatus(jobId, jobType),
      );
      return makeResponse(res, true, this.asyncJobService.toResponseDto(result));
    }

    @Get('workspace/:workspaceId')
    @ApiOkResponseGeneric({ type: [AsyncJobResponseDto], description: 'List workspace jobs from Redis' })
    async getWorkspaceJobs(
      @Param('workspaceId') workspaceId: number,
      @Query('status') status?: string,
      @Res() res: Response,
    ) {
      const result = await Promisify<any[]>(
        this.asyncJobService.getJobsForProject(workspaceId, status),
      );
      return makeResponse(res, true, result.map(j => this.asyncJobService.toResponseDto(j)));
    }

    @Post(':jobId/cancel')
    @ApiOkResponseGeneric({ type: Boolean, description: 'Cancel a pending/processing job' })
    @ApiQuery({ name: 'jobType', enum: AsyncJobType, required: true })
    async cancelJob(
      @Param('jobId') jobId: string,
      @Query('jobType') jobType: AsyncJobType,
      @Res() res: Response,
    ) {
      const result = await Promisify<boolean>(
        this.asyncJobService.cancelJob(jobId, jobType),
      );
      return makeResponse(res, true, result);
    }
  }
  ```

### 6.6 New Queue Names

- [ ] **Add to `src/common/constants.ts`**
  ```typescript
  export const QueueNames = {
    // ... existing
    DISCOVERY: 'discovery',
    OUTREACH: 'outreach',
    LEAD_ENRICHMENT: 'lead-enrichment',
    WEBSITE_SCRAPER: 'website-scraper',
  };

  export const QUEUE_JOB_NAMES = {
    // ... existing
    PROCESS_DISCOVERY_CHAT: 'process-discovery-chat',
    GENERATE_EXPERIMENTS: 'generate-experiments',
    ENRICH_LEAD: 'enrich-lead',
    GENERATE_OUTREACH: 'generate-outreach',
    SCRAPE_WEBSITE: 'scrape-website',
  };
  ```

### 6.7 Queue Consumer Pattern with Redis Progress Updates

All queue consumers MUST update progress via Bull's native methods (stored in Redis):

- [ ] **Example: `src/lead/consumers/lead-enrichment.consumer.ts`**
  ```typescript
  @Processor(QueueNames.LEAD_ENRICHMENT)
  export class LeadEnrichmentConsumer {
    constructor(
      @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
      private leadService: LeadService,
      private wizaService: WizaService,
    ) {}

    @Process(QUEUE_JOB_NAMES.ENRICH_LEAD)
    async handleEnrichLead(job: Job<LeadEnrichmentJobData>) {
      const { leadIds, projectId, totalSteps } = job.data;
      
      try {
        // Update job data in Redis - mark as started
        await job.update({
          ...job.data,
          startedAt: new Date().toISOString(),
          currentStep: 'Starting lead enrichment',
          completedSteps: 0,
        });
        job.progress(0);

        for (let i = 0; i < leadIds.length; i++) {
          const leadId = leadIds[i];
          
          // Update progress in Redis (no DB call!)
          const completedSteps = i + 1;
          const progress = Math.round((completedSteps / totalSteps) * 100);
          
          await job.update({
            ...job.data,
            completedSteps,
            currentStep: `Enriching lead ${completedSteps} of ${totalSteps}`,
          });
          job.progress(progress);

          // Do actual enrichment work
          await Promisify<any>(
            this.leadService.enrichLead(leadId),
          );
        }

        // Mark as complete - store output in Redis
        await job.update({
          ...job.data,
          completedSteps: totalSteps,
          currentStep: 'Completed',
          output: {
            enrichedCount: leadIds.length,
            leadIds,
          },
        });
        job.progress(100);

        return { success: true, enrichedCount: leadIds.length };

      } catch (error) {
        this.logger.error(`Lead enrichment failed [jobId=${job.id}]: ${error.stack}`);
        
        // Store error in Redis
        await job.update({
          ...job.data,
          errorMessage: error.message,
          errorDetails: { stack: error.stack },
        });
        
        throw error; // Re-throw for Bull retry logic
      }
    }
  }
  ```

### 6.8 Service Pattern for Initiating Async Jobs (Redis-Native)

- [ ] **Example: How services should initiate async jobs**
  ```typescript
  // In lead.service.ts
  async enrichLeadsBatch(
    projectId: number,
    userId: number,
    leadIds: number[],
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`Initiating batch lead enrichment [count=${leadIds.length}]`);
      
      const totalSteps = leadIds.length;
      
      // Queue the job directly - Bull stores all state in Redis
      const job = await this.leadEnrichmentQueue.add(
        QUEUE_JOB_NAMES.ENRICH_LEAD,
        {
          // BaseJobData fields
          projectId,
          userId,
          jobType: AsyncJobType.BULK_LEAD_ENRICHMENT,
          totalSteps,
          completedSteps: 0,
          currentStep: 'Queued for processing',
          // Job-specific fields
          leadIds,
        } as LeadEnrichmentJobData,
        {
          // Bull job options
          removeOnComplete: { age: 3600 * 24 },  // Keep completed jobs for 24h
          removeOnFail: { age: 3600 * 24 * 7 },  // Keep failed jobs for 7d
        },
      );

      // Return job ID immediately for status polling
      return {
        data: {
          jobId: job.id.toString(),
          jobType: AsyncJobType.BULK_LEAD_ENRICHMENT,
        },
        error: null,
      };
    } catch (error) {
      this.logger.error(`Error initiating batch enrichment: ${error.stack}`);
      return { data: null, error };
    }
  }
  ```

### 6.9 Queue Consumers to Create

- [ ] **Create `src/discovery/consumers/discovery.consumer.ts`** - with Redis progress updates
- [ ] **Create `src/outreach/consumers/outreach.consumer.ts`** - with Redis progress updates
- [ ] **Create `src/lead/consumers/lead-enrichment.consumer.ts`** - with Redis progress updates
- [ ] **Create `src/scraper/consumers/website-scraper.consumer.ts`** - with Redis progress updates

### 6.10 Frontend Polling Helper

- [ ] **Create `frontend-v1/lib/job-poller.ts`**
  ```typescript
  export interface JobProgressInfo {
    progress: number;           // 0-100
    progressText: string;       // "75% complete"
    currentStep: string;        // "Enriching lead 3 of 4"
    completedSteps: number;
    totalSteps: number;
    estimatedSecondsRemaining: number | null;
  }

  export async function pollJobStatus(
    jobId: string,
    jobType: string,  // Required for Redis-native lookup (determines which queue)
    onProgress?: (info: JobProgressInfo) => void,
    pollIntervalMs = 2000,
    timeoutMs = 300000,  // 5 minutes default
  ): Promise<AsyncJobResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      // Pass jobType as query param - needed to look up the correct Bull queue in Redis
      const job = await backendFetch<AsyncJobResponse>(`/jobs/${jobId}?jobType=${jobType}`);
      
      if (onProgress) {
        onProgress({
          progress: job.progress,
          progressText: job.progressText,
          currentStep: job.currentStep,
          completedSteps: job.completedSteps,
          totalSteps: job.totalSteps,
          estimatedSecondsRemaining: job.estimatedSecondsRemaining,
        });
      }
      
      if (job.status === 'completed') {
        return job;
      }
      
      if (job.status === 'failed') {
        throw new Error(job.errorMessage || 'Job failed');
      }
      
      if (job.status === 'cancelled') {
        throw new Error('Job was cancelled');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error('Job polling timed out');
  }
  ```

### 6.11 Frontend React Hook for Job Progress

- [ ] **Create `frontend-v1/hooks/use-job-progress.ts`**
  ```typescript
  import { useState, useEffect, useCallback } from 'react';
  import { pollJobStatus, JobProgressInfo } from '@/lib/job-poller';

  export interface UseJobProgressOptions {
    pollIntervalMs?: number;
    timeoutMs?: number;
    onComplete?: (output: any) => void;
    onError?: (error: Error) => void;
  }

  export interface UseJobProgressReturn {
    // Progress state
    progress: number;              // 0-100
    progressText: string;          // "75% complete"
    currentStep: string;           // "Enriching lead 3 of 4"
    completedSteps: number;
    totalSteps: number;
    estimatedTimeRemaining: string | null;  // "~2 min remaining"
    
    // Job state
    status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    isLoading: boolean;
    isComplete: boolean;
    isFailed: boolean;
    error: Error | null;
    output: any | null;
    
    // Actions
    startPolling: (jobId: string, jobType: string) => void;  // jobType required
    cancel: () => void;
  }

  export function useJobProgress(options: UseJobProgressOptions = {}): UseJobProgressReturn {
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobType, setJobType] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'>('idle');
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [currentStep, setCurrentStep] = useState('');
    const [completedSteps, setCompletedSteps] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [output, setOutput] = useState<any | null>(null);
    const [cancelled, setCancelled] = useState(false);

    const formatTimeRemaining = (seconds: number | null): string | null => {
      if (seconds === null || seconds <= 0) return null;
      if (seconds < 60) return `~${Math.round(seconds)}s remaining`;
      const minutes = Math.round(seconds / 60);
      return `~${minutes} min remaining`;
    };

    const handleProgress = useCallback((info: JobProgressInfo) => {
      setProgress(info.progress);
      setProgressText(info.progressText);
      setCurrentStep(info.currentStep);
      setCompletedSteps(info.completedSteps);
      setTotalSteps(info.totalSteps);
      setEstimatedSeconds(info.estimatedSecondsRemaining);
      setStatus('processing');
    }, []);

    const startPolling = useCallback(async (newJobId: string, newJobType: string) => {
      setJobId(newJobId);
      setJobType(newJobType);
      setStatus('pending');
      setProgress(0);
      setError(null);
      setOutput(null);
      setCancelled(false);

      try {
        const result = await pollJobStatus(
          newJobId,
          newJobType,  // Pass jobType for Redis queue lookup
          handleProgress,
          options.pollIntervalMs,
          options.timeoutMs,
        );
        
        if (!cancelled) {
          setStatus('completed');
          setProgress(100);
          setOutput(result.output);
          options.onComplete?.(result.output);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setStatus('failed');
          setError(error);
          options.onError?.(error);
        }
      }
    }, [options, handleProgress, cancelled]);

    const cancel = useCallback(() => {
      setCancelled(true);
      setStatus('cancelled');
    }, []);

    return {
      progress,
      progressText,
      currentStep,
      completedSteps,
      totalSteps,
      estimatedTimeRemaining: formatTimeRemaining(estimatedSeconds),
      status,
      isLoading: status === 'pending' || status === 'processing',
      isComplete: status === 'completed',
      isFailed: status === 'failed',
      error,
      output,
      startPolling,
      cancel,
    };
  }
  ```

- [ ] **Example usage in React component:**
  ```tsx
  function LeadEnrichmentButton({ leadIds, workspaceId }: Props) {
    const { 
      progress, 
      progressText, 
      currentStep,
      estimatedTimeRemaining,
      isLoading, 
      isComplete,
      error,
      startPolling 
    } = useJobProgress({
      onComplete: (output) => {
        toast.success(`Enriched ${output.enrichedCount} leads!`);
        refetchLeads();
      },
      onError: (err) => {
        toast.error(`Enrichment failed: ${err.message}`);
      },
    });

    const handleEnrich = async () => {
      // Response includes both jobId and jobType
      const { jobId, jobType } = await backendFetch<{ jobId: string; jobType: string }>(
        `/campaigns/${campaignId}/leads/enrich`,
        { method: 'POST', body: JSON.stringify({ leadIds }) }
      );
      // Start polling with both values
      startPolling(jobId, jobType);
    };

    return (
      <div>
        <Button onClick={handleEnrich} disabled={isLoading}>
          {isLoading ? 'Enriching...' : 'Enrich Leads'}
        </Button>
        
        {isLoading && (
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-1">
              {progressText} — {currentStep}
            </p>
            {estimatedTimeRemaining && (
              <p className="text-xs text-muted-foreground">
                {estimatedTimeRemaining}
              </p>
            )}
          </div>
        )}
        
        {error && (
          <p className="text-sm text-destructive mt-2">{error.message}</p>
        )}
      </div>
    );
  }
  ```

---

## Phase 7: Frontend Proxy Layer

### 7.0 Environment Setup (Frontend)

- [ ] **Add to `frontend-v1/.env.local` and `.env.sample`**
  ```bash
  # Backend-v1 Configuration
  # URL of the backend-v1 NestJS API server
  # Use localhost for development, production URL for deployment
  BACKEND_V1_URL=http://localhost:3001
  ```

### 7.1 Create Backend Client

- [ ] **Create `frontend-v1/lib/backend-client.ts`**
  ```typescript
  const BACKEND_URL = process.env.BACKEND_V1_URL;

  export async function backendFetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    return response.json();
  }
  ```

### 7.2 Update Server Actions

- [ ] **Update `frontend-v1/app/actions/workspaces.ts`**
  - Replace Supabase calls with `backendFetch()`
  
- [ ] **Update `frontend-v1/app/actions/campaigns.ts`**
  - Replace Supabase calls with `backendFetch()`

- [ ] **Update `frontend-v1/app/actions/leads.ts`**
  - Replace Supabase calls with `backendFetch()`

- [ ] **Update `frontend-v1/app/actions/onboarding.ts`**
  - Replace Supabase calls with `backendFetch()`

### 7.3 Update API Routes

- [ ] **Update `frontend-v1/app/api/chat/discovery/route.ts`**
  - Proxy to backend-v1 discovery endpoint

- [ ] **Update `frontend-v1/app/api/content/generate/route.ts`**
  - Proxy to backend-v1 outreach endpoint

- [ ] **Update `frontend-v1/app/api/filters/**`**
  - Proxy to backend-v1 wiza endpoints

### 7.4 Environment Variables

- [ ] **Add to `frontend-v1/.env`**
  ```bash
  BACKEND_V1_URL=http://localhost:3001  # or production URL
  ```

---

## Phase 8: Data Migration

### 8.1 Migration Script

- [ ] **Create `scripts/migrate-supabase-to-backend.ts`**
  - Export workspaces from Supabase → create as Projects in backend-v1
  - Export onboarding_data from Supabase
  - Export experiments from Supabase
  - Export campaigns from Supabase
  - Export leads from Supabase
  - Import into backend-v1 PostgreSQL
  - Map Supabase workspace IDs to backend-v1 Project IDs

### 8.2 User Mapping

> **Note:** With auto-provisioning in Phase 1, most of this happens automatically on first login.
> This migration is only for existing Supabase data that needs to be preserved.

- [ ] **Create user mapping script**
  - For each Supabase user with existing data:
    1. Create Client (personal organization) in backend-v1
    2. Create User in backend-v1 with `SupabaseUserID` populated
    3. For each Supabase workspace owned by this user:
       - Create Project in backend-v1 (with workspace fields)
       - Create ProjectUser record with OWNER role
    4. For each workspace membership (non-owner):
       - Create ProjectUser record with appropriate role

- [ ] **ID Mapping Table**
  ```sql
  -- Temporary mapping table for migration
  CREATE TABLE migration_id_map (
    EntityType VARCHAR(50),
    SupabaseID UUID,
    BackendID BIGINT,
    UNIQUE(EntityType, SupabaseID)
  );
  ```

### 8.3 Data Validation

- [ ] Verify row counts match
- [ ] Verify relationships intact
- [ ] Verify JSONB data integrity

---

## Phase 9: Testing & Validation

### 9.1 Unit Tests

- [ ] Auth guard tests
- [ ] Repository service tests
- [ ] Module service tests

### 9.2 Integration Tests

- [ ] Workspace CRUD flow
- [ ] Onboarding save/load flow
- [ ] Discovery chat flow
- [ ] Campaign + Lead flow
- [ ] Outreach generation flow

### 9.3 E2E Tests

- [ ] Full user journey: Login → Create Workspace → Discovery → Campaign → Leads

### 9.4 Performance Testing

- [ ] API response times
- [ ] Database query performance
- [ ] AI endpoint latency

### 9.5 Rollback Plan

- [ ] Keep Supabase tables intact during migration
- [ ] Feature flag to switch between Supabase and backend-v1
- [ ] Documented rollback procedure

---

## ✅ Success Criteria

- [ ] All frontend server actions call backend-v1 (no direct Supabase writes)
- [ ] Supabase only used for authentication
- [ ] All AI/LLM calls happen in backend-v1
- [ ] Response times ≤ current performance
- [ ] Zero data loss during migration
- [ ] All existing features work after migration

---

## 📅 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Auth | 2 days | None |
| Phase 2: Schema | 3 days | Phase 1 |
| Phase 3: Repos | 2 days | Phase 2 |
| Phase 4: Modules | 5 days | Phase 3 |
| Phase 5: AI Services | 3 days | Phase 4 |
| Phase 6: Queue Jobs | 2 days | Phase 5 |
| Phase 7: Frontend | 3 days | Phase 4 |
| Phase 8: Data Migration | 2 days | Phase 7 |
| Phase 9: Testing | 3 days | Phase 8 |

**Total: ~25 days (5 weeks)**

---

## 📝 Notes

- Start with Phase 1 (Auth) as it's the foundation
- Phases 4-6 can partially overlap
- Keep detailed logs during data migration
- Test each phase before moving to next

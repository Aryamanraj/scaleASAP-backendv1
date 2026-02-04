# E2E Indexer Setup Plan (Multi-Module)

## Goal
Create an end-to-end indexer workflow that:
1. Scrapes LinkedIn profile data.
2. Stores profile data and related artifacts in Postgres.
3. Runs multiple enrichers in the correct order.
4. Persists progress and outputs for job status polling.
5. Produces structured conclusions tailored to design agencies.

---

## Inputs
- LinkedIn profile (URL or URN)
- Company info (name, domain, optional LinkedIn company URL)

## Outputs
- Job ID for tracking progress
- Persisted artifacts in Postgres (Documents, Claims, etc.)
- Final structured conclusions:
  - Decision maker who cares about brand/positioning
  - Funded or bootstrapped but high revenue ($100k+/month)
  - Active on LinkedIn
  - Competitors mentioned + references
  - Hiring posts or welcomes
  - Topics and themes of posts
  - Tone signals (anxious, excited, rage bait, etc.) mapped to growth signals
  - Mentions of colleagues (add to network graph)
  - Other social handles or emails (Twitter/IG/email)
  - Event attendance (past/upcoming)
  - Low-quality engagement behavior (e.g., 1-word comments / freebies)
  - Mentions of design help or hiring designers

## Composer Plan Docs
- [docs/e2e-composers/decision-maker-brand-composer-plan.md](docs/e2e-composers/decision-maker-brand-composer-plan.md)
- [docs/e2e-composers/revenue-signal-composer-plan.md](docs/e2e-composers/revenue-signal-composer-plan.md)
- [docs/e2e-composers/linkedin-activity-composer-plan.md](docs/e2e-composers/linkedin-activity-composer-plan.md)
- [docs/e2e-composers/competitor-mentions-composer-plan.md](docs/e2e-composers/competitor-mentions-composer-plan.md)
- [docs/e2e-composers/hiring-signals-composer-plan.md](docs/e2e-composers/hiring-signals-composer-plan.md)
- [docs/e2e-composers/topic-themes-composer-plan.md](docs/e2e-composers/topic-themes-composer-plan.md)
- [docs/e2e-composers/tone-signals-composer-plan.md](docs/e2e-composers/tone-signals-composer-plan.md)
- [docs/e2e-composers/colleague-network-composer-plan.md](docs/e2e-composers/colleague-network-composer-plan.md)
- [docs/e2e-composers/external-socials-composer-plan.md](docs/e2e-composers/external-socials-composer-plan.md)
- [docs/e2e-composers/event-attendance-composer-plan.md](docs/e2e-composers/event-attendance-composer-plan.md)
- [docs/e2e-composers/low-quality-engagement-composer-plan.md](docs/e2e-composers/low-quality-engagement-composer-plan.md)
- [docs/e2e-composers/design-help-signals-composer-plan.md](docs/e2e-composers/design-help-signals-composer-plan.md)

---

## Conventions & Rules (Must Follow)
- **Repo services** only use standard methods (`get`, `getAll`, `create`, `update`, `delete`, `count`). No custom queries in repos.
- **ResultWithError + Promisify**: all service/repo calls return `ResultWithError`; always unwrap with `Promisify<T>()`.
- **Controllers**: use `makeResponse()` and wrap service calls with `Promisify`.
- **TypeORM relations**: use object syntax `{ Project: true }`, not array syntax.
- **Entities**: PascalCase column names, `@ApiProperty()` on every column.
- **No silent errors**: log and return errors; do not swallow exceptions.
- **Composer outputs** = `Claims` only. Enrichers may write `Documents`/`PostItems`/`ContentChunks`/etc.
- **Parallel composers**: run all composers in parallel once prerequisites are done.
- **Failure isolation**: one composer failure must not stop others unless explicitly dependent.
- **Missing data**: composers must handle missing posts/comments gracefully; if *no data at all* for a person, fail the flow with reason.
- **AI JSON output**: follow the `AIService.run` sanitization + JSON parse fallback pattern.

## Where to Find Context
- Conventions: [conventions.md](conventions.md)
- Database schema & module scope: [docs/db-architecture.md](docs/db-architecture.md)
- Migration rules & patterns: [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md)
- Module keys: [src/common/constants/module-keys.constants.ts](src/common/constants/module-keys.constants.ts)
- Document kinds: [src/common/types/document.types.ts](src/common/types/document.types.ts)
- Claim keys: [src/common/types/claim-types.ts](src/common/types/claim-types.ts)
- AI prompt pattern: [src/ai/prompts/age-range.prompt.ts](src/ai/prompts/age-range.prompt.ts)
- AI JSON handling: [src/ai/ai.service.ts](src/ai/ai.service.ts)
- JSON fallback parsing: [src/ai/services/outreach-ai.service.ts](src/ai/services/outreach-ai.service.ts)
- Existing composer pattern: [src/observer/services/handlers/layer-1-composer.handler.ts](src/observer/services/handlers/layer-1-composer.handler.ts)

---

## API Contract (Indexer Job)
### Endpoint
- API server call that enqueues an indexer job.
- Returns `jobId` immediately.

### Job Status
- Query by `jobId` to return status, progress, and any partial artifacts.
- Results stored in persistent storage (Postgres + Documents/Claims + ModuleRuns).

---

## Data Persistence Plan
### Storage Targets
- `Documents` for raw and intermediate artifacts.
- `Claims` for extracted facts (composer outputs).
- `LayerSnapshots` for aggregated profile understanding.
- `ModuleRuns` and `DiscoveryRunItems` for tracking module execution.
- **FlowRuns (new table)** for end-to-end orchestration results (see Job Orchestration Plan).

### Required Documents
- `linkedin_profile` (raw profile scrape)
- `linkedin_posts` (raw posts scrape)
- `content_chunks` or derived chunk artifacts (from content-chunker)
- `chunk_evidence` (from posts chunk evidence extractor)
- `normalized_posts` (from linkedin-posts-normalizer)
- `digital_identity_signals` (from linkedin-digital-identity-enricher)
- `personality_active_times` (from personality-active-times-reducer)
- `final_summary` (structured conclusions)

---

## Proposed Execution Order
1. **LinkedIn Profile Scrape** (scraper module)
   - Store `linkedin_profile` document.
   - Upsert `Persons` by LinkedIn URL/URN.

2. **LinkedIn Posts Fetch** (if not already part of scrape)
   - Store `linkedin_posts` document.

3. **content-chunker**
   - Input: `linkedin_posts` document.
   - Output: content chunks + `content_chunks` document.

4. **linkedin-posts-chunk-evidence-extractor**
   - Input: content chunks.
   - Output: evidence per chunk.

5. **linkedin-posts-normalizer**
   - Input: `linkedin_posts` + evidence.
   - Output: normalized post items in DB.

6. **personality-active-times-reducer**
   - Input: normalized post items.
   - Output: active time patterns and engagement behavior.

7. **linkedin-digital-identity-enricher**
   - Input: profile + normalized content.
   - Output: social handles, email patterns, digital footprint signals.

8. **Final Summary Composer** (new)
   - Inputs: all previous outputs.
   - Writes `final_summary` document + structured conclusions.

## Pre-Composer Alignment Step
Before implementing composers, **audit and align existing enrichers/connectors** to the output shape from the new LinkedIn scraper.
- Ensure expected fields (profile, posts, chunks, evidence) match the new scraper payload.
- Update parsing/normalization logic where needed.
- If required inputs are **missing** (e.g., comments not provided by the scraper), record it in **not built.md** with:
   - Missing data source
   - Affected modules
   - Why the module cannot be completed yet
   - What data/changes are needed to unblock

### Modules to Align (Initial List)
- **linkedin-posts-normalizer**: map `ProfileData.recentPosts[]` to PostItem fields.
- **linkedin-posts-chunk-evidence-extractor**: ensure it reads chunked post text from the new PostItems.
- **content-chunker**: confirm chunking on PostItems still applies with new post timestamps.
- **personality-active-times-reducer**: confirm it reads engagement/timestamps from PostItems.
- **linkedin-core-identity-enricher**: ensure profile payload fields match new scraper output.
- **linkedin-digital-identity-enricher**: ensure profile payload fields match new scraper output.
- **linkedin-posts-comments connector**: confirm whether scraper provides comments; if not, log in not built.md.

## Composer Execution Model
- **All composers run in parallel** once prerequisite enrichers complete.
- **Composer outputs are Claims** (not Documents). Each composer writes its own claim set with confidence and evidence.
- One composer failure **must not** block others unless it depends on that composer’s output.

---

## Job Orchestration Plan
1. API request triggers creation of `ModuleRun` (PROJECT_LEVEL or PERSON_LEVEL).
2. Module dispatcher enqueues modules in order.
3. Each module updates `ModuleRun` status + writes artifacts.
4. Job status endpoint reads from `ModuleRun` + latest documents.

## Flow Run Tracking (New Table)
- Persist a **FlowRun** record per end-to-end execution.
- Store: flow key, input summary, modules scheduled, modules completed, modules failed, failure reasons (if known).
- FlowRun must be queryable by `jobId` and survive partial failures.

---

## Validation Checklist
- Profile scrape creates/updates `Person` correctly by LinkedIn URL/URN.
- Each module writes documents and invalidates older versions.
- Progress and failures are visible through job status.
- Final summary is produced even if some optional modules fail.
- Composer claims are created even if some other composers fail.

---

## Open Decisions
- Whether profile scrape should also trigger posts fetch automatically.
- Whether final summary is stored as a `Document`, `Claim`, or `LayerSnapshot`.
- Whether company info maps to `Organization` and `Project` during run.
- FlowRuns table schema (fields + indices) and where it lives.
- Confidence calibration: AI returns a confidence score; map directly to `Claim.Confidence`.
- Input data availability rules: composers should handle missing posts/comments gracefully; if **no data at all** for a person, fail the flow with reason.

---

## Next Steps
- Confirm the order above or adjust based on existing module dependencies.
- Implement job enqueue + status polling endpoints.
- Add final summary composer module.

## Implementation Approach
- Use the per-composer plan docs as the source of truth and build each composer one-by-one.
- After each composer is implemented, run `yarn build` to validate the application before proceeding to the next composer.

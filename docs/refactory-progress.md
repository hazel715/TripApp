# Refactory progress

Baseline: de799630a0e928bf5bc729ebc027c216273cf661 (feature/refactory)

## Completed
- Confirmed clean working tree and baseline HEAD on 2026-10-13.
- Inventoried existing Domain/Application sources and tests; infrastructure, api and web do not exist yet.

## In progress
- Phase A: validate existing rules and establish executable test/build baseline.

## Remaining
- Domain/Application validation and regression tests.
- PostgreSQL/Drizzle persistence and migrations.
- Fastify API, transactional passwordless authentication, Expense/Share endpoints.
- Exact settlement verification, commit-only SSE, React Web, Quick Memo verification.
- Workspace integration tests, build, README and documentation synchronization.

## Tests
- Not run yet; dependencies/runtime availability must be established.

## Known issues to investigate
- TypeScript uses .ts imports without an import rewriting build setting.
- Login token consumption uses read then save; concurrent verification needs an atomic transaction.
- Current burden aggregates all settlement currencies together, although Expense overrides are allowed; group by currency before calculating.
- Minimum-transfer subset enumeration uses 32-bit masks and exponential storage; validate input bounds and correctness.
- Expense date validation checks format only, not calendar validity.
- Some existing docs claim Infrastructure/API/Web are implemented, but those directories are absent.

## Next step
- Establish Node/npm runtime, install dependencies, run existing tests and typecheck, then repair Phase A while preserving existing sources.

Checkpoint: Domain tests 23/23 passed; Domain build and Application typecheck passed. Fixed Decimal imports, TypeScript relative import rewriting, calendar dates, cross-project drafts, decimal memo scaling, currency-isolated totals and exact O(n*2^n) zero-partition DP. Auth transaction and application adapter tests remain for persistence/API phases.

Persistence checkpoint: nine Drizzle tables and generated SQL migration exist. PostgreSQL repositories share an AsyncLocalStorage transaction; project writes lock the parent. Auth consumption is conditional UPDATE RETURNING inside the login transaction. Actual PostgreSQL integration still pending (Docker is not on PATH).

API checkpoint: Fastify auth/projects/expenses/categories and authenticated SSE connected. API/Application memory integration tests verify CRUD, share mismatch, negative values, rollback, reopen, no notification before commit and one-time concurrent verification. Domain+API: 27 tests passed; API typecheck passed. PostgreSQL/Docker executables unavailable on PATH.

Web checkpoint: React login, project list/create, owner member controls, global category creation, Expense CRUD/equal split/custom shares, server memo preview, currency-grouped burden and explicit final settlement implemented. SSE only sets a notification flag. Web typecheck passed.

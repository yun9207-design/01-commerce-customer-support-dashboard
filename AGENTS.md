# Project instructions for coding agents

## Goal / user context
The owner is a backend beginner learning unfamiliar businesses through working dashboards. Explain business cause and effect in Korean. Preserve the learning experience: inputs → validation → decisions → state changes → audit. Work on business model 01 only; do not create the other 29 apps or rewrite the whole project without a request.

## Read first
README.md, docs/FEATURE_MATRIX.md, docs/ARCHITECTURE.md, docs/DATA_MODEL.md, SECURITY.md, docs/TEST_REPORT.md. Inspect actual source rather than assuming documented features work.

## Non-negotiable business boundaries
- This is a local learning application, not a production customer support service.
- Role selector is a simulation, NOT login or authorization security.
- Outbox messages and order cancellation are simulated. Never imply that an email, SMS, refund, cancellation or real AI request occurred when it did not.
- Rule-based drafts are NOT AI output. Keep labels explicit.
- Cancellation requires matching linked order/email, eligible pre-shipment status, amount limit, cancellation ticket type, and a separate approval.
- Recheck order version, policy version, amount, eligibility at approval and execution. Block stale approval. Never execute twice.
- Never silently import a subset of an invalid CSV. Never overwrite duplicate IDs. Do not overwrite unreadable stored data automatically.
- Money is integer KRW. Do not reinterpret it as cents.
- The amount policy is a learning rule, not a legal conclusion about consumer cancellation rights.
- Use fake/example.com data. Never send local customer content to an external API without explicit scope and user approval.
- No API secrets in browser code, `VITE_*` public variables, previews, screenshots, logs or Git.
- No `eval`, arbitrary HTML injection, remote CDN runtime dependencies, or undocumented telemetry.

## Source of truth
src/domain/engine.ts is the pure command boundary. Tests inject clock/id. src/domain/rules.ts holds eligibility and answer grounding. src/domain/validation.ts validates restored data. src/lib/repository.ts saves. src/store.tsx only publishes state AFTER successful persistence. UI pages do not mutate store objects directly.

Do not directly edit generated preview.html or dist/. Edit src/ and rebuild. Preserve readability, Korean labels, mobile behavior, empty/error states, accessibility labels, explanatory panels and backup tools.

## Verification
Use Node >=22.12.0.
1. `npm install` (first run), review and commit resulting package-lock.json. Afterwards `npm ci`.
2. `npm run typecheck`
3. `npm run typecheck:domain`
4. `npm test`
5. `npm run build`
6. `npm run build:vite`
7. If Playwright is installed: `python tests/browser_smoke.py`; use BASE_URL for real-origin tests.

First reported deliverable must state which commands actually ran and which did not. Do not claim CI or deployment passed merely because workflow YAML exists. Do not weaken tsconfig/tests to make checks green.

## Two build paths
Default build uses TypeScript transpileModule + a custom CommonJS wrapper and vendored React 19.1.1. It bundles ONLY current source modules, CSS and React/ReactDOM; it does NOT do semantic checking or general npm dependency bundling. The Vite source build uses installed npm dependencies and outputs dist-vite/.

Keep React, ReactDOM and vendor runtime versions aligned. React upgrade requires regenerating the portable runtime with license/provenance retained, or migrating the portable builder to a documented standard single-file build. Do not silently change only package.json. New dependencies/assets require explicit build support and tests. Inspect THIRD_PARTY_NOTICES.md.

## Incremental work contract
Before coding, explain: user problem, one limited change, touched files, data migrations, acceptance tests. Add regression tests for defects. Make small reviewable commits. Preserve working states. No dependency churn, boilerplate backend, fake credentials or unfinished connect buttons presented as implemented integrations.

For real backend work, follow docs/BACKEND_ROADMAP.md: define async repository and migrations, authenticated server-side authorization, transactional recheck/idempotency, secret management, backup/restore and deployment tests. LocalRepository is synchronous; a network adapter is not a one-line replacement.

After changes summarize in Korean: what now works, how the owner can test it, what remains simulated, exact test results, one suggested next step.

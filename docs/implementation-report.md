# Electra Implementation Report

Generated: 2026-05-01

## Executive Summary

Electra is a Civic Intelligence OS: a full-stack, AI-guided civic workflow product designed to help voters understand and complete voting-related tasks with less confusion. The product combines a React/TypeScript frontend, a FastAPI backend, Firebase Auth and Firestore persistence, structured AI responses, adaptive user behavior tracking, and a trust/transparency layer.

This implementation pass focused on building the production spine for the highest-risk slice of the system:

- Hyper-personalized onboarding
- Adaptive civic copilot behavior
- Streaming-ready Oracle API contract
- Firestore-backed session, profile, conversation, and review queue persistence
- Trust and transparency metadata on AI explanations
- Strict TypeScript repair work
- Frontend and backend test stabilization

The result is a working vertical slice: a voter enters Electra, answers onboarding questions, receives a personalized civic guidance experience, can ask the Oracle questions, sees source/confidence metadata, and can flag outdated sources for review.

## Scope Completed

This pass implemented the foundation for Features 1, 4, and 5 from the product brief.

### Feature 1: Adaptive Civic Copilot

Implemented pieces:

- A behavior watcher hook that detects when a user remains on one step for 30 seconds.
- A stuck-user intervention that appears in the Oracle panel.
- A "Simplify this step" action that asks the Oracle to reduce the explanation to one clear next action.
- Automatic simplification after repeated rewind/back-navigation behavior.
- Tone mode support in the type system:
  - `five-year-old`
  - `citizen`
  - `policy-expert`
- Session-aware Oracle requests.
- Conversation turn persistence to Firestore.
- Streaming-ready frontend client function.
- Backend `/api/oracle/stream` endpoint that streams JSON response chunks.

Files involved:

- `frontend/src/features/copilot/useAdaptiveCopilot.ts`
- `frontend/src/components/oracle/OraclePanel.tsx`
- `frontend/src/engines/oracleClient.ts`
- `frontend/src/engines/stateEngine.ts`
- `frontend/src/App.tsx`
- `backend/routes/oracle.py`
- `backend/services/claude_service.py`

Novelty:

The copilot is not just a chatbot panel. It observes user behavior and changes the experience when it detects hesitation or confusion. This is a civic UX pattern: the product notices when a voter is stuck before they have to articulate that they are stuck.

### Feature 4: Hyper-personalized Onboarding Engine

Implemented pieces:

- Three-step adaptive onboarding:
  - Location
  - Civic familiarity
  - Accessibility needs
- Progress ring-style completion indicator.
- Familiarity-to-tone mapping:
  - First-time or some-experience users default to `citizen`
  - Confident users default to `policy-expert`
- Onboarding profile stored in Zustand.
- Onboarding profile persisted to Firestore.
- Main application gated until onboarding is complete.
- Profile included in Oracle requests.

Files involved:

- `frontend/src/features/onboarding/OnboardingEngine.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types.ts`
- `frontend/src/firebase/firestore.ts`
- `frontend/tests/integration/OnboardingEngine.test.tsx`

Novelty:

The onboarding engine is not a marketing survey. Its output directly reconfigures semantic complexity and AI context. The user's familiarity level changes how Electra explains civic steps, and accessibility needs become part of the durable session profile.

### Feature 5: Trust and Transparency Layer

Implemented pieces:

- Collapsible "How do we know this?" panel attached to Oracle explanations.
- Source cards with:
  - Title
  - Publisher
  - URL
  - Last verified date
- Confidence percentage.
- Human-readable rationale.
- "Flag as outdated" button.
- Firestore review queue writes for outdated-source reports.
- Backend Oracle mock/error responses now include trust metadata.
- Claude system prompt updated to request trust metadata.

Files involved:

- `frontend/src/features/trust/TrustPanel.tsx`
- `frontend/src/components/oracle/OraclePanel.tsx`
- `frontend/src/firebase/firestore.ts`
- `frontend/src/types.ts`
- `backend/services/claude_service.py`
- `frontend/tests/integration/TrustPanel.test.tsx`

Novelty:

Electra treats trust as a first-class product surface. Instead of making users blindly trust AI explanations, every answer has a provenance trail and a user-facing correction mechanism. This is especially important for civic infrastructure, where stale information can cause real harm.

## Architecture Decisions

### Decision 1: Contract-first AI UI

The highest-risk technical area is the AI-to-UI contract. The frontend must never blindly render arbitrary model output. The model response is represented as a structured `OracleResponse` with known fields:

- `message`
- `tone`
- `render`
- `renderProps`
- `primaryAction`
- `secondaryAction`
- `progress`
- `proactiveWarning`
- `stateTransition`
- `cognitiveLevel`
- `nextAnticipated`
- `confidence`
- `trust`

Why this matters:

- Keeps the UI deterministic.
- Allows only known render keys.
- Makes testing possible.
- Keeps trust metadata attached to explanations.
- Supports future validation and schema versioning.

### Decision 2: Firestore as the durable civic memory

Firestore is used for durable state:

- Session persistence
- Conversation history
- Onboarding profile
- Review queue for outdated-source flags

The Firestore adapter now uses a typed converter pattern for sessions.

Why this matters:

- Returning users can be restored to the correct journey context.
- AI conversations can be audited and replayed.
- Trust flags can feed a review workflow.
- The persistence layer becomes explicit instead of scattered.

### Decision 3: Feature-first structure for new work

New product surfaces were added under `frontend/src/features`:

- `features/onboarding`
- `features/copilot`
- `features/trust`

Why this matters:

- Keeps feature ownership clear.
- Avoids dumping everything into generic `components`.
- Matches the requested architecture direction.
- Makes future additions like `features/simulator` and `features/journey-visualizer` natural.

## Technical Stack Used

Frontend:

- React 18
- TypeScript strict mode
- Vite
- Zustand
- Tailwind CSS
- Framer Motion
- Firebase Web SDK
- Vitest
- Testing Library

Backend:

- FastAPI
- Pydantic
- SlowAPI rate limiting
- Anthropic Claude SDK
- Firebase Admin
- Pytest
- FastAPI TestClient

Persistence and auth:

- Firebase Auth
- Firestore

Testing and QA:

- TypeScript compiler
- Vite production build
- Vitest unit and integration tests
- Pytest backend route tests

## Frontend Details

### `OnboardingEngine`

Path:

`frontend/src/features/onboarding/OnboardingEngine.tsx`

Purpose:

Collects the minimum personal context Electra needs before civic guidance begins.

Questions:

1. Where are you voting?
2. How familiar is this?
3. Any access needs?

State collected:

- `location`
- `familiarity`
- `accessibilityNeeds`
- `toneMode`
- `completedAt`

Accessibility considerations:

- One question per screen.
- Real form labels and fieldsets.
- Buttons have clear pressed/selected states.
- Minimum 48px-ish tap targets through `min-h-12`.
- Works at mobile widths.

Motion:

- Uses Framer Motion.
- Honors reduced motion through `useReducedMotion`.

### `useAdaptiveCopilot`

Path:

`frontend/src/features/copilot/useAdaptiveCopilot.ts`

Purpose:

Watches the current journey state and surfaces a stuck intervention after 30 seconds.

Behavior:

- Starts a timer whenever `currentState` changes.
- If the user remains on the same step for 30 seconds, sets `stuckInterventionVisible` in Zustand.
- Clears the timer when the state changes.

Product effect:

The interface gently notices hesitation and offers simpler help.

### `TrustPanel`

Path:

`frontend/src/features/trust/TrustPanel.tsx`

Purpose:

Shows provenance for Oracle explanations.

Fields:

- Confidence
- Last verified date
- Rationale
- Source cards
- Flag as outdated action

Persistence:

The flag button writes to the Firestore `reviewQueue` collection through `flagSourceAsOutdated`.

### `OraclePanel`

Path:

`frontend/src/components/oracle/OraclePanel.tsx`

Changes:

- Displays the stuck intervention.
- Calls the Oracle with a simplification prompt when the user asks for help.
- Renders the TrustPanel below every Oracle answer.
- Removes inline submit logic into named handlers.
- Keeps busy/loading skeleton behavior.

### `App`

Path:

`frontend/src/App.tsx`

Changes:

- Uses onboarding as the entry gate.
- Calls `useAdaptiveCopilot`.
- Includes profile and session ID in Oracle calls.
- Persists conversation turns to Firestore.
- Persists onboarding profile to Firestore.
- Persists session payload including profile.

### `stateEngine`

Path:

`frontend/src/engines/stateEngine.ts`

Changes:

- Added profile to store state.
- Added back-click count.
- Added stuck-intervention visibility state.
- Added `completeOnboarding`.
- Added `showStuckIntervention`.
- Added `dismissStuckIntervention`.
- Rewind behavior now increments back-click count.
- After two rewinds, explanation style automatically shifts toward `five-year-old`.

Novelty:

This turns confusion into a state signal. Repeated backtracking changes how Electra speaks.

### `oracleClient`

Path:

`frontend/src/engines/oracleClient.ts`

Changes:

- Replaced loose `any` payload with typed `OracleRequest`.
- Added timeout handling.
- Added exponential-ish retry delays.
- Added auth token header support.
- Added `/api/oracle/stream` client.
- Added abort-signal support.

Important note:

The streaming client is ready for token rendering, but the UI currently still uses the non-streaming `requestOracle` call. This pass made the API and client ready; the next pass should wire real token-by-token rendering into the Oracle panel state.

### `firestore`

Path:

`frontend/src/firebase/firestore.ts`

Changes:

- Rebuilt Firestore adapter around typed functions.
- Added `persistSession`.
- Added `loadSession`.
- Added `persistConversationTurn`.
- Added `persistOnboardingProfile`.
- Added `flagSourceAsOutdated`.
- Added typed Firestore converter for stored sessions.

### `firebase/config`

Path:

`frontend/src/firebase/config.ts`

Changes:

- Removed `any` from analytics.
- Added safe local fallback Firebase config values so tests can import Firebase modules without crashing on missing env vars.

### `firebase/analytics`

Path:

`frontend/src/firebase/analytics.ts`

Changes:

- Removed production `console.log`.
- Replaced loose `any` event payloads.
- Added `trackEvent` async-compatible wrapper for tests and tracking utilities.

### `i18n`

Path:

`frontend/src/i18n/index.ts`

Changes:

- Replaced runtime dependency on `i18next` and `react-i18next` for this code path with a typed dictionary export.
- Restored `getCopy`.
- Restored `translations` for tests.

Why:

The build was failing because installed dependencies and imports were out of sync. The typed dictionary is sufficient for current app usage and testable under strict TypeScript.

## Backend Details

### Oracle route

Path:

`backend/routes/oracle.py`

Changes:

- Added `sessionId` and `profile` to `OracleRequest`.
- Added `/api/oracle/stream`.
- Streaming route returns chunked JSON text.
- Fixed route import by moving rate limiter out of `backend.main`.

### Rate limiter

Path:

`backend/services/rate_limit.py`

Purpose:

Avoids circular import between `backend.main` and route modules.

### Claude service

Path:

`backend/services/claude_service.py`

Changes:

- Updated system prompt schema to use `action` instead of `transition`, matching frontend types.
- Added trust metadata to the expected AI response.
- Added fallback trust metadata.
- Mock and error responses now include trust metadata.

Why:

The frontend depends on `primaryAction.action`, but the older backend prompt asked Claude for `transition`. This mismatch could break user actions. The response contract is now aligned.

## Testing Work Completed

### Frontend tests added

`frontend/tests/integration/OnboardingEngine.test.tsx`

Verifies:

- Location entry.
- Familiarity selection.
- Accessibility need selection.
- Final profile shape.

`frontend/tests/integration/TrustPanel.test.tsx`

Verifies:

- Trust panel opens.
- Source card is visible.
- Flag-as-outdated writes correct Firestore review payload.

`frontend/tests/unit/useAdaptiveCopilot.test.tsx`

Verifies:

- Stuck intervention appears after 30 seconds.

### Frontend tests repaired

Updated existing tests to account for onboarding now gating the app:

- `CognitiveLevelSwitch.test.tsx`
- `JourneyFlow.test.tsx`
- `FirebaseSync.test.tsx`

### Test setup repaired

Path:

`frontend/tests/setup.ts`

Changes:

- Added Firebase Auth mock.
- Added Firestore mock.
- Added Firebase app mock.
- Added Analytics mock.

Why:

Tests should not hit real Firebase services. Real OAuth remains the production code path; tests use controlled mocks.

### Vitest config repaired

Path:

`frontend/vitest.config.ts`

Changes:

- Corrected setup file path from missing `vitest.setup.ts` to `tests/setup.ts`.
- Restricted Vitest to unit/integration tests so Playwright specs are not accidentally executed by Vitest.

### Backend tests repaired

Paths:

- `backend/tests/test_oracle.py`
- `backend/tests/test_simulations.py`

Changes:

- Converted async tests to synchronous FastAPI `TestClient` tests.
- Added streaming endpoint test.
- Added trust metadata assertion.

Why:

The environment did not have the async pytest plugin active, so async test collection failed. TestClient keeps the route tests fast and stable.

## Verification Results

Frontend production build:

Command:

`npm.cmd --prefix frontend run build`

Result:

Passed.

Note:

Vite warns that the main bundle is larger than 500 kB after minification. This is not a failure, but it should be addressed with manual chunking and deeper code splitting.

Frontend unit/integration tests:

Command:

`npm.cmd --prefix frontend run test`

Result:

Passed.

Result details:

- 15 test files passed
- 37 tests passed

Backend tests:

Command:

`python -m pytest backend`

Result:

Passed.

Result details:

- 5 tests passed

Warnings:

- FastAPI `on_event` is deprecated and should eventually be replaced with lifespan handlers.
- Framer Motion prints reduced-motion warnings in tests.

## Local Development Server

The dev server was started with:

`npm run dev`

Observed ports:

- Frontend: `http://[::1]:5173`
- Backend: `http://localhost:8000`

`http://localhost:5173` did not respond in this environment because Vite was listening on IPv6 loopback. `http://[::1]:5173` returned status `200`.

## Novel Product Patterns Now Present

### Behavior-responsive civic guidance

Electra does not wait for the user to say "I am confused." It watches for signals:

- Long pause
- Backtracking/rewind behavior

Then it adjusts the UI and explanation style.

### Provenance-attached AI

AI explanations now carry trust metadata. This is essential for civic information because correctness is contextual, time-sensitive, and location-sensitive.

### Review queue for stale civic data

Users can flag outdated source material. That creates the beginning of a civic content governance loop.

### Semantic complexity layer

The app distinguishes explanation style from visual layout. A user's familiarity can change the semantic level of the guidance while keeping the same civic workflow.

### Agentic UI contract

The Oracle returns structured UI instructions instead of plain text. This keeps Electra closer to an AI-guided interface than a normal chatbot.

## Current Limitations

### Streaming is API-ready, not fully UI-rendered yet

The backend streaming endpoint and frontend streaming client exist. The main `App` still calls `requestOracle`, not `streamOracle`, so token-by-token rendering is not yet visible in the UI.

Next step:

Wire `streamOracle` into `App` and add a streaming message state to `OraclePanel`.

### Civic Journey Visualizer is not completed in this pass

The existing journey/sidebar remains. The requested animated DAG replay is not yet implemented as a feature-first `features/journey` module.

Next step:

Build a Framer Motion DAG based on `JOURNEY_GRAPH`, with completed/current/skipped node states and completion replay.

### Election Integrity Simulator is not completed in this pass

Existing simulation pieces remain, and backend mock endpoints still exist. The requested full-bleed ballot ingestion -> tallying -> certification simulator with anomalies and confidence intervals is not yet built.

Next step:

Create `features/simulator` with typed event frames, provenance buttons, confidence intervals, and timeline scrubbing.

### Firestore Remote Config feature flags are not implemented

Feature flags were part of the architecture mandate, but this pass focused on the core user/AI/trust spine.

Next step:

Add a typed feature flag service backed by Firebase Remote Config or Firestore.

### Every component does not yet have a corresponding test

New feature components/hooks have tests. The whole existing app still does not satisfy the mandate that every component has a corresponding test file.

Next step:

Add a component-test inventory and fill gaps in priority order.

### Coverage threshold is not enforced yet

Vitest and Pytest run successfully, but CI coverage enforcement was not implemented in this pass.

Next step:

Add GitHub Actions workflow and coverage gates.

## Production Risks Remaining

### Real Firebase security rules

Firestore writes are wired, but production safety depends on Firestore security rules. The app should restrict:

- Session writes to the signed-in user
- Review queue writes to authenticated users
- Admin review reads to privileged reviewers

### Real Claude response validation

The type contract exists, but runtime schema validation should be added before rendering AI responses.

Recommended tool:

- Zod on the frontend, or Pydantic schema normalization on the backend.

### Official civic source integration

Trust metadata currently includes a fallback source. A production civic app needs location-specific election-office sources and last-verified timestamps.

### Bundle size

The main Vite chunk is over 1 MB uncompressed. This may affect Core Web Vitals.

Recommended fix:

- Manual chunks for Firebase, Framer Motion, React Flow, Recharts, and Google Maps.

## Files Created

- `backend/services/rate_limit.py`
- `frontend/src/features/copilot/useAdaptiveCopilot.ts`
- `frontend/src/features/onboarding/OnboardingEngine.tsx`
- `frontend/src/features/trust/TrustPanel.tsx`
- `frontend/tests/integration/OnboardingEngine.test.tsx`
- `frontend/tests/integration/TrustPanel.test.tsx`
- `frontend/tests/unit/useAdaptiveCopilot.test.tsx`
- `frontend/tsconfig.node.json`

## Files Significantly Modified

- `backend/main.py`
- `backend/routes/oracle.py`
- `backend/services/claude_service.py`
- `backend/tests/test_oracle.py`
- `backend/tests/test_simulations.py`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/AppShell.tsx`
- `frontend/src/components/oracle/OraclePanel.tsx`
- `frontend/src/components/shared/CognitiveLevelToggle.tsx`
- `frontend/src/design/tokens.css`
- `frontend/src/engines/confusionTracker.ts`
- `frontend/src/engines/oracleClient.ts`
- `frontend/src/engines/predictionEngine.ts`
- `frontend/src/engines/stateEngine.ts`
- `frontend/src/firebase/analytics.ts`
- `frontend/src/firebase/auth.ts`
- `frontend/src/firebase/config.ts`
- `frontend/src/firebase/firestore.ts`
- `frontend/src/i18n/index.ts`
- `frontend/src/types.ts`
- `frontend/tests/setup.ts`
- `frontend/vitest.config.ts`

## What This Means for Electra

Before this pass, Electra had strong prototype ideas but some broken contracts:

- Frontend imports did not match implementations.
- Firestore helper types did not match app usage.
- Oracle client exported the wrong function shape.
- Backend route imports had a circular dependency.
- Tests were configured to load missing setup files.
- Vitest tried to collect Playwright specs.
- Firebase could crash tests on missing API keys.

After this pass:

- The app builds.
- Unit/integration tests pass.
- Backend tests pass.
- Onboarding exists as a real product screen.
- The copilot can detect stuck behavior.
- Trust panels exist on Oracle answers.
- Firestore persistence functions are typed and centralized.
- Oracle requests include session/profile context.
- Backend and frontend action naming are aligned.
- Streaming endpoint/client foundations exist.

## Recommended Next Build Order

1. Real streaming UI rendering
2. Runtime Oracle response validation
3. Animated Civic Journey Visualizer
4. Live Election Integrity Simulator
5. Firestore Remote Config feature flags
6. CI coverage gate
7. Component test inventory and completion
8. Bundle splitting for Core Web Vitals
9. Firestore security rules and admin review queue

## Junior Developer Gotcha

Do not confuse personalization with decoration. If onboarding data only changes text labels, it is not personalization. In Electra, onboarding data must feed the state machine, AI prompt context, UI complexity layer, persistence model, and return-session behavior. Otherwise the product says it understands the voter, but the system does not actually remember or adapt.

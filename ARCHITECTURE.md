# Electra Architecture

Electra is a civic intelligence system that turns a user's voting question into a typed render directive. The core rule is simple: the language model never directly controls unsafe UI. It returns JSON, the backend validates that JSON, and the frontend maps the validated render key to a known React component.

## System Flow

```text
User Input
  -> React OraclePanel
  -> sanitizeUserInput
  -> OracleService.query
  -> FastAPI /api/v1/oracle
  -> RateLimiter + Pydantic OracleRequest
  -> OracleService.process
  -> CacheService lookup
  -> Gemini structured prompt
  -> Pydantic OracleResponse
  -> ComponentRegistry
  -> OracleErrorBoundary
  -> Firebase Analytics + Firestore
```

## Frontend

The frontend is a Vite React application using strict TypeScript. Shared civic contracts live in `src/types`, API calls live in `src/services`, stateful behavior lives in hooks, and dynamic UI rendering is isolated behind the component registry. Error boundaries wrap dynamic render zones so a failed civic module cannot take down the full session.

Accessibility is built into the shell with skip navigation, live regions for Oracle output, busy states for loading, native interactive controls, and focus-visible styling. Performance is handled through lazy loading, memoized render data, and Zustand selectors.

## Backend

The backend is packaged under `backend/app` with routers, models, services, dependencies, and utilities separated by responsibility. FastAPI handles HTTP routing and dependency injection. Pydantic v2 validates all request and response models. The Oracle service owns Gemini prompting, response parsing, and cache integration.

Legacy `/api/*` routes remain mounted for compatibility with the existing app and tests, while `/api/v1/*` is the production contract for the new Oracle service.

## Data And Observability

Firestore stores session and civic score state behind auth-gated rules. Firebase Analytics receives confusion events, journey steps, prediction hits, and civic score changes. Backend security headers, frontend CSP tags, and input caps reduce browser and API attack surface.

## Deployment

The frontend can be deployed as static assets. The backend is ready for Google Cloud Run through the `backend/Dockerfile`, environment-driven settings, and health endpoints for Firebase and Gemini readiness.

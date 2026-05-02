# Electra - Civic Intelligence OS

> Solving democratic confusion for India's 950M eligible voters through
> an Agentic UI system powered by Gemini AI, Firebase, and Google Cloud.

## Problem -> Solution Traceability

| Identified Problem | Electra Solution | Implementation |
|---|---|---|
| 950M voters face multi-step confusion | Agentic UI dynamically routes journey | Oracle JSON controls React component tree via ComponentRegistry |
| Users cannot tell when they are lost | Passive Confusion Heatmap | civicBus + Firebase Analytics tracks rereads, retreats, timeouts |
| LLM latency breaks user flow | Predictive Shadow Rendering | Pre-fetches components based on Oracle predictedNextKeys |
| One-size explanations fail | Adaptive Cognitive Levels | 3 reading levels (simple/detailed/legal), real-time Gemini rewrite |
| Mid-journey mistakes cause dropout | Temporal Rewind Engine | DAG-based journey state with time-travel to any prior node |
| Election process opacity | Election Integrity Simulator | Step-by-step voting simulation with anomaly injection |

## Architecture

```text
User
  |
  v
React Frontend
  |
  | sanitized civic query + journey state
  v
FastAPI Oracle API
  |
  | guarded prompt + cache key
  v
Gemini LLM
  |
  | strict JSON
  v
Pydantic Response Validation
  |
  | render_key + component_props
  v
ComponentRegistry
  |
  +--> Dynamic Civic Module
  |
  +--> Firebase Firestore sync
  |
  +--> Firebase Analytics confusion events
```

## Tech Stack

React + TypeScript powers a fast, accessible, type-safe civic interface. Vite keeps builds small and quick for public-sector deployment speed. Zustand stores journey state with selector-based rendering so dynamic Oracle updates do not repaint the entire app. Vitest and React Testing Library validate hooks, services, accessibility contracts, and component behavior.

FastAPI gives the backend an explicit OpenAPI surface, async request handling, and clean dependency injection. Pydantic v2 validates every Oracle request and response before it reaches the interface. mypy and ruff protect backend quality.

Firebase Auth supports anonymous and Google sign-in without blocking first-time users. Firestore syncs session and score state. Firebase Analytics records confusion events that help improve the civic journey. Gemini acts as the reasoning layer, while Google Cloud Run is the deployment target for a containerized API.

## Google Services Integration

- Firebase Auth (Anonymous + Google OAuth)
- Firebase Firestore (journey state sync)
- Firebase Analytics (confusion heatmap)
- Google Cloud Run (containerized deployment)
- Google Cloud Logging + Error Reporting
- Gemini 1.5 Pro (Oracle reasoning engine)

## Local Development

```bash
npm install
npm --prefix frontend install
python -m pip install -r backend/requirements.txt
npm run dev
```

## Verification

```bash
npm run type-check
npm run lint
npm run test
npm run build
cd backend && python -m mypy app/ && python -m pytest tests/ -v --cov=app --cov-report=term-missing && python -m ruff check .
```

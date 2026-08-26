# SportSpark AI

SportSpark AI is an AI-powered sports quiz and engagement-content platform. It combines live sports retrieval, persistent historical knowledge, structured generation, duplicate detection, interactive answering, saved content, history, source transparency, creator workflows, and analytics.

## Features

- Latest sports question generation using OpenRouter with web-search tooling
- Historical retrieval from persistent ChromaDB with web fallback
- Mixed latest and historical batches
- MCQ, True/False, This-or-That Poll, Fill in the Blank, and Guess the Number
- Source-grounded factual generation with Pydantic validation
- Exact SHA-256, fuzzy, and semantic duplicate prevention
- Interactive answer feedback and local poll percentage aggregation
- Creator mode, copy controls, Instagram-ready copy, source access, save and history
- AI connection status, dark/light theme, responsive layout, motion, accessibility-oriented interaction
- SQLite for local development with SQLAlchemy portability to PostgreSQL
- Docker Compose support

## Architecture

The React frontend communicates only with the FastAPI backend. The backend owns all secrets and makes OpenRouter requests. A retrieval router selects web search, ChromaDB, or both based on time scope. Structured model output is validated again with Pydantic before persistence. Duplicate detection combines normalized text, SHA-256 fingerprints, fuzzy similarity, and ChromaDB semantic similarity. SQLAlchemy persists batches, questions, options, sources, answers, saved state, attempts, fingerprints, and settings.

## Retrieval flow

Latest requests use OpenRouter web-grounded generation. Historical requests query ChromaDB first and use web fallback when the local collection is insufficient. Mixed requests use available historical context and web retrieval together. Source URLs, titles, dates, and supporting statements are persisted with generated factual questions.

## Type-specific prompt architecture

The generation service gives the model explicit format constraints for every requested type. MCQ and fill-blank require four unique A-D options. Polls are opinion-only with two options and no answer. Guess-the-number items require a numeric target, positive tolerance, and an exact accepted range. Each returned item is independently validated by the corresponding Pydantic schema.

## Duplicate detection

The backend normalizes question text, stores SHA-256 fingerprints, compares fuzzy similarity against prior questions and the active batch, and checks semantic similarity against a persistent ChromaDB generated-question collection. The default semantic threshold is 0.88. Rejected candidates are regenerated across multiple attempts rather than silently returned.

## OpenRouter setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `OPENROUTER_API_KEY`.
3. Keep `OPENROUTER_MODEL=openrouter/auto` or choose another compatible model.
4. Never place the key in frontend environment files.

The backend uses `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`.

## ChromaDB setup

ChromaDB is persistent and uses `CHROMA_PERSIST_DIRECTORY`. The app creates two collections: `historical_sports_knowledge` and `generated_questions`. Trusted historical facts can be ingested through `POST /api/knowledge/ingest` and searched through `GET /api/knowledge/search?q=...`.

## Environment variables

Backend variables are documented in `backend/.env.example`. Frontend configuration uses only `VITE_API_BASE_URL`. Secrets are server-side.

## Local installation

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Docker installation

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

## Database migrations

The app creates tables automatically for local startup. Alembic configuration is included for production migration workflows.

```bash
cd backend
alembic revision --autogenerate -m "schema change"
alembic upgrade head
```

## Test commands

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```

Production frontend build:

```bash
cd frontend
npm run build
```

## API overview

- `POST /api/generate`
- `GET /api/batches/{id}`
- `POST /api/questions/{id}/answer`
- `POST /api/questions/{id}/regenerate`
- `POST /api/batches/{id}/regenerate`
- `POST /api/questions/{id}/save`
- `DELETE /api/questions/{id}`
- `GET /api/history`
- `DELETE /api/history`
- `GET /api/analytics`
- `GET /api/questions/{id}/sources`
- `GET /api/export`
- `GET /api/health`
- `GET /api/settings`
- `PUT /api/settings/{key}`
- `POST /api/knowledge/ingest`
- `GET /api/knowledge/search`

## Troubleshooting

If AI status is red, verify the OpenRouter key and backend logs. Amber indicates fallback or temporary connectivity issues. If no batch can be created, broaden the requested sport/time filters or add reliable historical knowledge. If ChromaDB fails to initialize, verify write permissions on the configured persistence directory.

## Screenshots

Run the frontend and capture the Generate, History, Saved, Analytics, Player, Knowledge Sources, and Settings views for deployment documentation.

## Known limitations

OpenRouter web-search server-tool behavior can vary by selected model and account capabilities, so production deployments should verify the configured model supports the chosen tool syntax and structured outputs. The Alembic initial revision is intentionally empty because local startup creates the schema directly; production teams should replace it with an autogenerated baseline migration before first deployment.

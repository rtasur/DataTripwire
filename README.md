# DataTripwire

Responsibility-Aware Continuous Data Trust & Adaptive Threat Containment.

> A valid login should never become unlimited trust.

## Repository layout

- `frontend/` — React + TypeScript + Tailwind application(s)
- `backend/` — Node.js + Express API, authentication, authorization, security middleware
- `ai-service/` — Python + FastAPI analytics service
- `tests/` — cross-service API checks, attack scenarios, QA assets
- `docs/` — architecture, API contract, security notes
- `infra/` — Docker/local infrastructure

## Collaboration model

- `main` — stable/demo-ready only
- `develop` — integration branch
- `feature/*` — individual work
- `fix/*` — bug fixes
- `test/*` — QA work
- `docs/*` — documentation

Never push directly to `main` or `develop`. Use pull requests.

## Local ports

- Frontend: `5173`
- Backend API: `3000`
- Backend Swagger UI: `3000/docs`
- AI Service: `8001`

## Initial setup

### Backend

```powershell
cd backend
npm install
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### AI service

```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Swagger

Swagger UI is intentionally hosted by the backend. Do not create a separate Swagger repository. The shared API contract lives in `backend/docs/openapi.yaml`.

Open:

`http://localhost:3000/docs`

## Environment variables

Copy `.env.example` to the relevant service `.env` file. Never commit real secrets.

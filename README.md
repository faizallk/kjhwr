# kjhwr — UK Wind Generation Forecast Dashboard

A web app for UK energy traders to view day-ahead wind generation forecasts against actuals and evaluate forecast accuracy for January 2026. Data is sourced exclusively from the [Elexon BMRS public API](https://bmrs.elexon.co.uk).

> **AI tools used:** Amazon Q Developer (AWS IDE plugin) was used to assist with code generation and review during development.

---

## Live App

- **Frontend:** https://kjhwr-frontend.onrender.com
- **Backend API:** https://kjhwr-backend.onrender.com

> Note: Render free tier spins down after 15 min of inactivity. First load may take ~30 seconds.

---

## Directory Structure

```
kjhwr/
├── backend/
│   ├── app/
│   │   ├── __init__.py       # Makes app a Python package
│   │   ├── main.py           # FastAPI app with 3 API routes + CORS
│   │   ├── elexon.py         # Fetches FUELHH actuals and WINDFOR forecasts from Elexon
│   │   ├── analysis.py       # Day-ahead selection logic + MAE, RMSE, Bias per day
│   │   └── schemas.py        # Pydantic response models
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ForecastChart.tsx   # Recharts line chart: forecast vs actuals
│   │   │   ├── AccuracyTable.tsx   # Per-day accuracy metrics table with colour coding
│   │   │   └── StatusMessage.tsx   # Skeleton loading + error display
│   │   ├── hooks/
│   │   │   └── useFetch.ts         # Generic data-fetching hook (axios)
│   │   ├── App.tsx                 # Main dashboard: KPI strip + chart + table
│   │   ├── App.css                 # Dashboard styles
│   │   └── index.css               # Global reset + CSS variables
│   ├── nginx.conf                  # Serves React SPA + proxies /api to backend
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts              # Dev proxy: /api -> localhost:8000
├── docker-compose.yml
└── README.md
```

---

## API Endpoints

| Method | Path             | Description                                          |
|--------|------------------|------------------------------------------------------|
| GET    | `/api/actuals`   | Half-hourly WIND actuals for Jan 2026 (FUELHH)       |
| GET    | `/api/forecasts` | Day-ahead WINDFOR forecasts for Jan 2026             |
| GET    | `/api/accuracy`  | Per-day MAE, RMSE, Bias for Jan 2026                 |
| GET    | `/health`        | Health check                                         |

---

## Environment Variables

Neither `.env` file is committed to git. Copy the examples and fill in as needed:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| File | Variable | Description |
|------|----------|-------------|
| `backend/.env` | `ELEXON_BASE_URL` | Elexon API base URL (has default, optional) |
| `backend/.env` | `ALLOWED_ORIGINS` | CORS origins, e.g. `https://kjhwr-frontend.onrender.com` |
| `frontend/.env` | `VITE_API_URL` | Backend URL in prod — leave empty for local dev |

> For **Render deployment**, set these in the Render dashboard under Environment — do not put real values in any committed file.

---

## How to Run

### Option 1 — Docker (recommended)

```bash
git clone https://github.com/YOUR_USERNAME/kjhwr.git
cd kjhwr
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Option 2 — Local dev (no Docker)

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (in a separate terminal)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` requests to `localhost:8000`.

---

## Architecture

```
Browser
  └── React + Recharts (Vite dev / nginx in prod)
            │  /api/*
            ▼
       FastAPI (Python)
            │
            ▼
    Elexon BMRS API (public, no auth)
```

- All data fetching and computation happens in the backend — the frontend only renders.
- The `/api/accuracy` endpoint makes 5 chunked requests to Elexon (7-day window limit per request) to cover all of January 2026.
- `analysis.py` selects the **latest forecast published before midnight of each delivery day**, which is exactly what a day-ahead trader would have available when making purchase decisions.

---

## Key Design Decisions

**No database**
January 2026 data is fetched live from Elexon on each request. For production, a caching layer (Redis or Postgres) would be added to avoid repeated API calls.

**Day-ahead selection logic**
`analysis.py:get_day_ahead_forecasts()` filters to forecasts published strictly before midnight UTC of the delivery day, then picks the latest one per hourly slot. This correctly represents the information a trader has at decision time.

**WINDFOR chunked fetching**
The Elexon WINDFOR paginated endpoint enforces a 7-day max window per request. `elexon.py:fetch_forecasts()` loops in 7-day chunks from Dec 31 2025 to Feb 1 2026 to cover all January delivery slots including day-ahead forecasts for Jan 1 (published Dec 31).

**Hourly alignment**
FUELHH actuals are half-hourly (48 slots/day); WINDFOR forecasts are hourly (24 slots/day). The frontend merges them by truncating timestamps to the hour and skipping `:30` actuals so both lines align correctly on the chart.

**Colour-coded accuracy table**
Green / yellow / red thresholds on MAE, RMSE, and Bias give traders an instant visual signal of which days had poor forecasts. A Day-of-week column helps spot weekend demand patterns.

**KPI summary strip**
Average MAE, RMSE, Bias, and worst day are shown in a header strip so traders see the month summary without scrolling.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 19, TypeScript, Vite        |
| Charting  | Recharts                          |
| HTTP      | Axios                             |
| Backend   | FastAPI, Python 3.12              |
| Data      | pandas, numpy, httpx              |
| Serving   | nginx (prod), Vite proxy (dev)    |
| Container | Docker, Docker Compose            |
| Deploy    | Render.com                        |

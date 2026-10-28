import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .elexon import fetch_actuals, fetch_forecasts
from .analysis import compute_accuracy, get_day_ahead_forecasts
from .schemas import GenerationPoint, ForecastPoint, AccuracyMetric

load_dotenv()

app = FastAPI(title="Wind Forecast Dashboard API")

# Read allowed origins from env — defaults to * for local dev
_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in _origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/actuals", response_model=list[GenerationPoint])
async def actuals():
    """Half-hourly wind actuals for January 2026."""
    try:
        return await fetch_actuals()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/forecasts", response_model=list[ForecastPoint])
async def forecasts():
    """Day-ahead wind forecasts for January 2026 delivery slots."""
    try:
        raw = await fetch_forecasts()
        df  = get_day_ahead_forecasts(raw)
        # Convert Timestamps → ISO strings so they're JSON serialisable
        df["startTime"]   = df["startTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        df["publishTime"] = df["publishTime"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/accuracy", response_model=list[AccuracyMetric])
async def accuracy():
    """Per-day forecast accuracy metrics (MAE, RMSE, Bias) for January 2026."""
    try:
        actuals_data   = await fetch_actuals()
        forecasts_data = await fetch_forecasts()
        return compute_accuracy(actuals_data, forecasts_data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}

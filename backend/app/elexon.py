import os
import httpx
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# Falls back to the public URL if not set in .env
ELEXON_BASE = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")

JAN_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
JAN_END   = datetime(2026, 2, 1, tzinfo=timezone.utc)


async def fetch_actuals() -> list[dict]:
    """
    Fetch half-hourly WIND actuals from FUELHH for January 2026.
    The stream endpoint supports settlementDate filtering for this dataset.
    """
    url = f"{ELEXON_BASE}/datasets/FUELHH/stream"
    params = {
        "settlementDateFrom": "2026-01-01",
        "settlementDateTo":   "2026-01-31",
        "fuelType":           "WIND",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    return [
        {"startTime": row["startTime"], "generation": float(row["generation"])}
        for row in data
        if row.get("fuelType") == "WIND"
    ]


async def fetch_forecasts() -> list[dict]:
    """
    Fetch WINDFOR forecasts for January 2026 using the paginated endpoint.
    The API enforces a 7-day max window per request, so we chunk across Jan.
    We start from Dec 31 so day-ahead forecasts for Jan 1 are included
    (they're published the day before, i.e. Dec 31).
    """
    # Publish window: Dec 31 2025 → Feb 1 2026 covers all day-ahead forecasts
    # for January 2026 delivery slots
    window_start = datetime(2025, 12, 31, tzinfo=timezone.utc)
    window_end   = JAN_END

    all_rows: list[dict] = []
    chunk_start = window_start

    async with httpx.AsyncClient(timeout=60) as client:
        while chunk_start < window_end:
            chunk_end = min(chunk_start + timedelta(days=7), window_end)

            resp = await client.get(
                f"{ELEXON_BASE}/datasets/WINDFOR",
                params={
                    "publishDateTimeFrom": chunk_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "publishDateTimeTo":   chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
                },
            )
            resp.raise_for_status()
            body = resp.json()

            # Response is {"data": [...]} for this endpoint
            rows = body.get("data", body) if isinstance(body, dict) else body
            all_rows.extend(rows)

            chunk_start = chunk_end

    # Only keep delivery slots that fall within January 2026
    result = []
    for row in all_rows:
        if not row.get("startTime") or not row.get("publishTime"):
            continue
        start = datetime.fromisoformat(row["startTime"].replace("Z", "+00:00"))
        if JAN_START <= start < JAN_END:
            result.append({
                "startTime":   row["startTime"],
                "publishTime": row["publishTime"],
                "generation":  float(row.get("generation") or 0),
            })

    return result

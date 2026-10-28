import pandas as pd
import numpy as np


def get_day_ahead_forecasts(forecasts: list[dict]) -> pd.DataFrame:
    """
    For each delivery half-hour, pick the latest forecast that was published
    before midnight of the delivery day (i.e. the day-ahead forecast).
    This mirrors how a trader would use the data.
    """
    df = pd.DataFrame(forecasts)
    df["startTime"]   = pd.to_datetime(df["startTime"],   utc=True)
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)

    # Midnight UTC of the delivery day = the cutoff for day-ahead publish
    df["deliveryDate"] = df["startTime"].dt.normalize()

    # Keep only forecasts published strictly before delivery day midnight
    df = df[df["publishTime"] < df["deliveryDate"]]

    # For each delivery slot, keep the most recently published forecast
    df = df.sort_values("publishTime")
    df = df.groupby("startTime", as_index=False).last()

    return df[["startTime", "publishTime", "generation"]]


def compute_accuracy(actuals: list[dict], forecasts: list[dict]) -> list[dict]:
    """
    Join day-ahead forecasts with actuals on startTime, then compute
    per-day MAE, RMSE, and bias (forecast - actual).
    """
    act_df = pd.DataFrame(actuals)
    act_df["startTime"] = pd.to_datetime(act_df["startTime"], utc=True)
    act_df = act_df.rename(columns={"generation": "actual"})

    fct_df = get_day_ahead_forecasts(forecasts)
    fct_df = fct_df.rename(columns={"generation": "forecast"})

    merged = pd.merge(act_df, fct_df, on="startTime", how="inner")
    if merged.empty:
        return []

    merged["error"] = merged["forecast"] - merged["actual"]
    merged["date"]  = merged["startTime"].dt.date.astype(str)

    metrics = []
    for day, grp in merged.groupby("date"):
        mae  = float(np.mean(np.abs(grp["error"])))
        rmse = float(np.sqrt(np.mean(grp["error"] ** 2)))
        bias = float(np.mean(grp["error"]))
        metrics.append({
            "date":  day,
            "mae":   round(mae,  1),
            "rmse":  round(rmse, 1),
            "bias":  round(bias, 1),
            "count": int(len(grp)),
        })

    return sorted(metrics, key=lambda x: x["date"])

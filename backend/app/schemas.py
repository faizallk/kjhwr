from pydantic import BaseModel

class GenerationPoint(BaseModel):
    startTime: str
    generation: float

class ForecastPoint(BaseModel):
    startTime: str
    publishTime: str
    generation: float

class AccuracyMetric(BaseModel):
    date: str        # e.g. "2026-01-05"
    mae: float       # Mean Absolute Error in MW
    rmse: float      # Root Mean Squared Error in MW
    bias: float      # Mean bias (forecast - actual), positive = over-forecast
    count: int       # number of half-hour periods used

import { useMemo } from 'react'
import { useFetch } from './hooks/useFetch'
import ForecastChart from './components/ForecastChart'
import AccuracyTable from './components/AccuracyTable'
import StatusMessage from './components/StatusMessage'
import './App.css'

interface Actual   { startTime: string; generation: number }
interface Forecast { startTime: string; publishTime: string; generation: number }
interface Metric   { date: string; mae: number; rmse: number; bias: number; count: number }

const API = import.meta.env.VITE_API_URL ?? ''

export default function App() {
  const actuals   = useFetch<Actual[]>  (`${API}/api/actuals`)
  const forecasts = useFetch<Forecast[]>(`${API}/api/forecasts`)
  const accuracy  = useFetch<Metric[]>  (`${API}/api/accuracy`)

  // Merge actuals + forecasts on the hour boundary.
  // Actuals are half-hourly; forecasts are hourly — key on "YYYY-MM-DDTHH".
  const chartData = useMemo(() => {
    if (!actuals.data || !forecasts.data) return []

    const toHourKey = (iso: string) => iso.slice(0, 13)
    const map = new Map<string, { time: string; actual?: number; forecast?: number }>()

    for (const a of actuals.data) {
      if (!a.startTime.includes(':30:')) {
        map.set(toHourKey(a.startTime), { time: a.startTime, actual: a.generation })
      }
    }
    for (const f of forecasts.data) {
      const key = toHourKey(f.startTime)
      const existing = map.get(key) ?? { time: f.startTime }
      map.set(key, { ...existing, forecast: f.generation })
    }

    return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time))
  }, [actuals.data, forecasts.data])

  // KPI summary values derived from accuracy data
  const kpis = useMemo(() => {
    if (!accuracy.data?.length) return null
    const avg = (k: keyof Metric) =>
      (accuracy.data!.reduce((s, r) => s + (r[k] as number), 0) / accuracy.data!.length)
    const worstDay = accuracy.data.reduce((a, b) => a.mae > b.mae ? a : b)
    return {
      mae:      avg('mae').toFixed(0),
      rmse:     avg('rmse').toFixed(0),
      bias:     avg('bias').toFixed(0),
      worstDay: new Date(worstDay.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      worstMae: worstDay.mae.toFixed(0),
    }
  }, [accuracy.data])

  const chartLoading = actuals.loading || forecasts.loading
  const chartError   = actuals.error   || forecasts.error

  return (
    <div className="app">

      {/* ── Top nav bar ── */}
      <header className="header">
        <div className="header-brand">
          <span className="header-icon">💨</span>
          <h1>UK Wind Generation Dashboard</h1>
        </div>
        <span className="header-badge">January 2026 · Elexon BMRS</span>
      </header>

      {/* ── KPI strip ── */}
      {kpis && (
        <div className="kpi-strip">
          <div className="kpi">
            <span className="kpi-label">Avg MAE</span>
            <span className="kpi-value">{Number(kpis.mae).toLocaleString()} MW</span>
            <span className="kpi-sub">Mean absolute error</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Avg RMSE</span>
            <span className="kpi-value">{Number(kpis.rmse).toLocaleString()} MW</span>
            <span className="kpi-sub">Root mean squared error</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Avg Bias</span>
            <span className="kpi-value">
              {Number(kpis.bias) > 0 ? '+' : ''}{Number(kpis.bias).toLocaleString()} MW
            </span>
            <span className="kpi-sub">{Number(kpis.bias) > 0 ? 'Over-forecast' : Number(kpis.bias) < 0 ? 'Under-forecast' : 'No bias'}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Worst Day</span>
            <span className="kpi-value">{kpis.worstDay}</span>
            <span className="kpi-sub">MAE {Number(kpis.worstMae).toLocaleString()} MW</span>
          </div>
        </div>
      )}

      <main className="main">

        {/* ── Chart card ── */}
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Forecast vs Actual Wind Generation</h2>
              <p className="card-subtitle">
                Hourly national wind output for January 2026. The dashed amber line is the
                day-ahead forecast available at the time of purchase decisions.
              </p>
            </div>
            <div className="legend-pills">
              <span className="pill">
                <span className="pill-dot" style={{ background: '#2563eb' }} />
                Actual
              </span>
              <span className="pill">
                <span className="pill-dot dashed" />
                Day-ahead Forecast
              </span>
            </div>
          </div>
          <div className="card-body">
            {chartLoading || chartError
              ? <StatusMessage loading={chartLoading} error={chartError} />
              : <ForecastChart data={chartData} />
            }
          </div>
        </section>

        {/* ── Accuracy table card ── */}
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Daily Forecast Accuracy — January 2026</h2>
              <p className="card-subtitle">
                Per-day error metrics. <strong>MAE</strong> = mean absolute error,{' '}
                <strong>RMSE</strong> = root mean squared error,{' '}
                <strong>Bias</strong> = mean (forecast − actual); positive = systematic over-forecast.
              </p>
            </div>
          </div>
          <div className="accuracy-legend">
            <span className="acc-badge">
              <span className="acc-swatch" style={{ background: '#dcfce7' }} /> Good
            </span>
            <span className="acc-badge">
              <span className="acc-swatch" style={{ background: '#fef9c3' }} /> Moderate
            </span>
            <span className="acc-badge">
              <span className="acc-swatch" style={{ background: '#fee2e2' }} /> Poor
            </span>
          </div>
          {accuracy.loading || accuracy.error
            ? <StatusMessage loading={accuracy.loading} error={accuracy.error} />
            : accuracy.data && <AccuracyTable data={accuracy.data} />
          }
        </section>

      </main>

      <footer className="footer">
        Data sourced live from{' '}
        <a href="https://bmrs.elexon.co.uk" target="_blank" rel="noreferrer">Elexon BMRS</a>
        {' '}· Built with React + FastAPI · AI-assisted with Amazon Q Developer
      </footer>
    </div>
  )
}

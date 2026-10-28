import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface Point {
  time: string
  actual?: number
  forecast?: number
}

interface Props {
  data: Point[]
}

// Full date label shown on the axis: "01 Jan 2026"
function fmtAxisDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// Tooltip header: "05 Jan 2026, 14:00"
function fmtTooltip(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

// Custom X-axis tick — only renders at midnight (T00:) to show one label per day
function DayTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x, y, payload } = props
  if (!payload?.value?.includes('T00:')) return null

  const label = fmtAxisDay(payload.value)
  // Split into two lines: "01 Jan" and "2026"
  const [dayMon, year] = [label.slice(0, 6), label.slice(7)]

  return (
    <g transform={`translate(${x},${(y ?? 0) + 4})`}>
      <text textAnchor="middle" fontSize={10} fill="#94a3b8" dy={0}>{dayMon}</text>
      <text textAnchor="middle" fontSize={10} fill="#94a3b8" dy={13}>{year}</text>
    </g>
  )
}

// Custom tooltip box
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      fontSize: 13,
    }}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#1e293b' }}>
        {fmtTooltip(label)}
      </p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: <strong>{p.value.toLocaleString()} MW</strong>
        </p>
      ))}
      {payload.length === 2 && (
        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 12, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
          Error: {(payload[1].value - payload[0].value > 0 ? '+' : '')}
          {(payload[1].value - payload[0].value).toLocaleString()} MW
        </p>
      )}
    </div>
  )
}

export default function ForecastChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

        <XAxis
          dataKey="time"
          interval={0}
          tick={<DayTick />}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          height={40}
        />

        <YAxis
          unit=" MW"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={76}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Vertical reference lines at each day boundary for easier reading */}
        {data
          .filter(d => d.time.includes('T00:'))
          .map(d => (
            <ReferenceLine key={d.time} x={d.time} stroke="#e2e8f0" strokeWidth={1} />
          ))
        }

        <Line
          type="monotone"
          dataKey="actual"
          stroke="#2563eb"
          dot={false}
          strokeWidth={2}
          name="Actual"
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#d97706"
          dot={false}
          strokeWidth={2}
          strokeDasharray="5 3"
          name="Day-ahead Forecast"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

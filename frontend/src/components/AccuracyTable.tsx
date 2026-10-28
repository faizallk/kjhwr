interface Metric {
  date: string
  mae: number
  rmse: number
  bias: number
  count: number
}

interface Props {
  data: Metric[]
}

function cellBg(val: number, warn: number, bad: number) {
  const abs = Math.abs(val)
  if (abs >= bad)  return 'var(--red-bg)'
  if (abs >= warn) return 'var(--yellow-bg)'
  return 'var(--green-bg)'
}

// "2026-01-05" -> "05 Jan 2026"
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

// "2026-01-05" -> "Mon"
function fmtDayOfWeek(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short', timeZone: 'UTC',
  })
}

export default function AccuracyTable({ data }: Props) {
  const avg = (key: keyof Metric) =>
    (data.reduce((s, r) => s + (r[key] as number), 0) / data.length).toFixed(1)

  const avgBias = parseFloat(avg('bias'))

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Day</th>
            <th>MAE (MW)</th>
            <th>RMSE (MW)</th>
            <th>Bias (MW)</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.date}>
              <td className="td-date">{fmtDate(row.date)}</td>
              {/* Day of week helps traders spot weekend patterns */}
              <td style={{ color: '#64748b', fontSize: 12 }}>{fmtDayOfWeek(row.date)}</td>
              <td style={{ background: cellBg(row.mae, 300, 600) }}>
                {row.mae.toLocaleString()}
              </td>
              <td style={{ background: cellBg(row.rmse, 400, 800) }}>
                {row.rmse.toLocaleString()}
              </td>
              <td style={{ background: cellBg(row.bias, 200, 500) }}>
                {row.bias > 0 ? '+' : ''}{row.bias.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Jan 2026 Average</td>
            <td>{avg('mae')}</td>
            <td>{avg('rmse')}</td>
            <td>{avgBias > 0 ? '+' : ''}{avg('bias')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

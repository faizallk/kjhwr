interface Props {
  loading: boolean
  error: string | null
}

export default function StatusMessage({ loading, error }: Props) {
  if (loading) {
    return (
      <div className="skeleton-wrap">
        <div className="skeleton" style={{ height: 24, width: '40%' }} />
        <div className="skeleton" style={{ height: 200 }} />
        <div className="skeleton" style={{ height: 16, width: '60%' }} />
      </div>
    )
  }
  if (error) {
    return (
      <div className="error-box">
        ⚠️ Failed to load data — {error}
      </div>
    )
  }
  return null
}

export default function CompletionGauge({ percent, label = 'Peak Flow' }) {
  const safe = Math.min(100, Math.max(0, percent));

  return (
    <div className="stat-card stat-card--gauge">
      <div
        className="gauge-ring"
        style={{
          background: `conic-gradient(var(--primary) ${safe * 3.6}deg, var(--surface-muted) 0)`,
        }}
      >
        <div className="gauge-ring__inner">
          <strong>{safe}%</strong>
        </div>
      </div>
      <p className="stat-card__label">{label}</p>
    </div>
  );
}

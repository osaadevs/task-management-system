import AnimatedNumber from './AnimatedNumber';

export default function StatCard({ label, value, accent = 'blue', icon }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__icon">{icon}</div>
      <div>
        <p className="stat-card__value">
          <AnimatedNumber value={value} />
        </p>
        <p className="stat-card__label">{label}</p>
      </div>
    </div>
  );
}

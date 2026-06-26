export default function ErrorRetry({ message, onRetry, retryLabel = 'Try again' }) {
  if (!message) return null;

  return (
    <div className="error-retry panel__padding">
      <p className="alert alert--error">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--small" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';

export default function LoadingState({
  label = 'Loading…',
  slowHint = 'Server is waking up — first load can take up to a minute on the free plan.',
}) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-state panel__padding">
      <p className="loading-state__label muted">{label}</p>
      {slow && <p className="loading-state__hint">{slowHint}</p>}
    </div>
  );
}

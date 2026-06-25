import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({ value, className = '' }) {
  const [display, setDisplay] = useState(value);
  const [pulseClass, setPulseClass] = useState('');
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = Number(value) || 0;

    if (from === to) {
      setDisplay(to);
      return undefined;
    }

    const direction = to > from ? 'up' : 'down';
    setPulseClass(`animated-number--${direction}`);

    const duration = 520;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        previous.current = to;
        window.setTimeout(() => setPulseClass(''), 300);
      }
    };

    requestAnimationFrame(tick);

    return () => {
      previous.current = to;
    };
  }, [value]);

  return (
    <span className={`animated-number ${pulseClass} ${className}`.trim()} aria-live="polite">
      {display}
    </span>
  );
}

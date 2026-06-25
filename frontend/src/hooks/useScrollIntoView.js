import { useCallback, useRef } from 'react';
import { scrollToElement } from '../utils/scrollToElement';

export function useScrollIntoView(options = {}) {
  const ref = useRef(null);

  const scrollIntoView = useCallback(
    (overrideOptions = {}) => {
      scrollToElement(ref.current, { ...options, ...overrideOptions });
    },
    [options]
  );

  return [ref, scrollIntoView];
}

export function scrollToElement(element, options = {}) {
  if (!element) return;

  const {
    behavior = 'smooth',
    block = 'start',
    focus = true,
    focusSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    highlightClass = 'scroll-target--highlight',
    highlightMs = 1200,
  } = options;

  window.requestAnimationFrame(() => {
    element.scrollIntoView({ behavior, block, inline: 'nearest' });

    if (highlightClass) {
      element.classList.add(highlightClass);
      window.setTimeout(() => element.classList.remove(highlightClass), highlightMs);
    }

    if (!focus) return;

    const target =
      element.matches?.(focusSelector) ? element : element.querySelector?.(focusSelector);

    if (target) {
      window.setTimeout(() => target.focus({ preventScroll: true }), behavior === 'smooth' ? 280 : 0);
    }
  });
}

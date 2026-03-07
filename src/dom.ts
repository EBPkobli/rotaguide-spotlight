export interface TargetRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function looksLikeSelector(target: string): boolean {
  if (!target) return false;
  return /^[.#\[]/.test(target) || /[ >:+~]/.test(target);
}

export function resolveTargetSelector(target: string): string {
  const trimmed = target.trim();
  if (!trimmed) return "";
  if (looksLikeSelector(trimmed)) {
    return trimmed;
  }
  return `[data-click-guide=\"${escapeAttributeValue(trimmed)}\"]`;
}

export function getRectForElement(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

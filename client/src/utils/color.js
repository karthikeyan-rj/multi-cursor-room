export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }
  return { r: 168, g: 85, b: 247 };
}

export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function deriveSecondaryColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * 0.55 + 99 * 0.45)}, ${Math.round(g * 0.55 + 102 * 0.45)}, ${Math.round(b * 0.55 + 241 * 0.45)})`;
}

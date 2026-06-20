import { useEffect } from 'react';
import { hexToRgb, rgba, deriveSecondaryColor } from '../utils/color';

export function useTheme(color) {
  useEffect(() => {
    const root = document.documentElement;
    const rgb = hexToRgb(color);
    const secondary = deriveSecondaryColor(color);

    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-glow', rgba(color, 0.25));
    root.style.setProperty('--border-active', rgba(color, 0.4));
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color} 0%, ${secondary} 100%)`);
    root.style.setProperty('--bg-radial-1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
    root.style.setProperty('--bg-radial-2', `rgba(${Math.round(rgb.r * 0.6)}, ${Math.round(rgb.g * 0.6)}, ${Math.round(rgb.b * 0.6)}, 0.1)`);
  }, [color]);
}

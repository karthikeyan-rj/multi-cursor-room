import { useRef, useEffect } from 'react';

export default function CursorTrail({ color }) {
  const localRef = useRef(null);
  const rafRef = useRef(null);
  const latestRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const handlePointerMove = (e) => {
      latestRef.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const el = localRef.current;
        if (!el) return;
        const { x, y } = latestRef.current;
        el.style.transform = `translate3d(${x - 9}px, ${y - 9}px, 0)`;
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const glowColor = color || 'rgba(59, 130, 246, 0.42)';

  return (
    <div
      ref={localRef}
      className="local-cursor-effect"
      aria-hidden="true"
      style={{
        '--glow-color': glowColor,
      }}
    />
  );
}

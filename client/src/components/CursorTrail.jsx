import { useRef, useEffect } from 'react';

export default function CursorTrail({ color }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dots = [];
    for (let i = 0; i < 8; i++) {
      const dot = document.createElement('div');
      const size = 4 + i * 0.4;
      dot.style.cssText = `position:fixed;border-radius:50%;pointer-events:none;z-index:60;background:${color};opacity:0;transform:translate(-50%,-50%);width:${size}px;height:${size}px;`;
      container.appendChild(dot);
      dots.push(dot);
    }

    let index = 0;
    const onMove = (e) => {
      const dot = dots[index % dots.length];
      dot.style.left = e.clientX + 'px';
      dot.style.top = e.clientY + 'px';
      dot.style.opacity = '0.5';
      dot.style.transition = 'none';
      setTimeout(() => { dot.style.opacity = '0'; }, 100);
      index++;
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      dots.forEach(d => d.remove());
    };
  }, [color]);

  return <div ref={containerRef} />;
}

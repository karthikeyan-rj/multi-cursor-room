import { useState, useRef, useCallback, useEffect } from 'react';

export default function useResizablePanel({ initialWidth = 420, minWidth = 360, maxWidth = 620, maxVw = 45 } = {}) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const delta = startXRef.current - e.clientX;
      const maxAllowed = Math.min(maxWidth, (maxVw / 100) * window.innerWidth);
      const newWidth = Math.max(minWidth, Math.min(maxAllowed, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, maxWidth, maxVw]);

  return { width, isResizing, isMobile, onMouseDown: handleMouseDown };
}

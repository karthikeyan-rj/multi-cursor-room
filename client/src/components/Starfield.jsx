import { useRef, useEffect } from 'react';

const STAR_COUNT = 200;
const DEPTH_LAYERS = 3;

function hsl(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId;
    let mouse = { x: -9999, y: -9999 };
    let burst = null;
    let constellation = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const depth = Math.floor(Math.random() * DEPTH_LAYERS);
      const baseRadius = 0.4 + Math.random() * 1.8;
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        baseX: 0, baseY: 0,
        radius: baseRadius * (1 + depth * 0.3),
        depth,
        hue: 200 + Math.random() * 60,
        lightness: 60 + Math.random() * 30,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
        velX: (Math.random() - 0.5) * 0.2,
        velY: (Math.random() - 0.5) * 0.2,
      });
    }

    function drawConstellationLines(star, i, allStars) {
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.08)';
      ctx.lineWidth = 0.5;
      const maxDist = 150;
      for (let j = i + 1; j < allStars.length; j++) {
        const dx = star.x - allStars[j].x;
        const dy = star.y - allStars[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(allStars[j].x, allStars[j].y);
          ctx.stroke();
        }
      }
    }

    function loop(time) {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.fillStyle = 'hsl(266, 76%, 8%)';
      ctx.fillRect(0, 0, w, h);

      const hasMouse = mouse.x > -9999;
      const mdx = hasMouse ? mouse.x - cx : 0;
      const mdy = hasMouse ? mouse.y - cy : 0;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const depthFactor = (s.depth + 1) / DEPTH_LAYERS;

        if (hasMouse) {
          const parallaxX = mdx * depthFactor * 0.012;
          const parallaxY = mdy * depthFactor * 0.012;
          s.x += (s.baseX + parallaxX - s.x) * 0.06;
          s.y += (s.baseY + parallaxY - s.y) * 0.06;
        } else {
          s.x += s.velX;
          s.y += s.velY;
        }

        s.baseX = s.x;
        s.baseY = s.y;

        if (s.x < -20) s.x = w + 20;
        if (s.x > w + 20) s.x = -20;
        if (s.y < -20) s.y = h + 20;
        if (s.y > h + 20) s.y = -20;

        if (burst) {
          const dx = s.x - burst.x;
          const dy = s.y - burst.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < burst.radius && dist > 0) {
            const force = (burst.radius - dist) / burst.radius * burst.strength;
            s.x += (dx / dist) * force;
            s.y += (dy / dist) * force;
          }
        }

        const twinkle = 0.6 + 0.4 * Math.sin(time * 0.001 * s.twinkleSpeed + s.twinklePhase);
        const alpha = twinkle * (0.6 + 0.4 * depthFactor);
        const radius = s.radius * (0.5 + 0.5 * twinkle);

        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = hsl(s.hue, 76, s.lightness);
        ctx.globalAlpha = alpha;
        ctx.fill();

        if (radius > 1.5) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, radius * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
          ctx.globalAlpha = alpha * 0.4;
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      if (constellation) {
        for (let i = 0; i < stars.length; i++) {
          drawConstellationLines(stars[i], i, stars);
        }
      }

      if (burst) {
        burst.radius += burst.speed;
        burst.strength *= 0.97;
        if (burst.strength < 0.1 || burst.radius > Math.max(w, h)) {
          burst = null;
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    function fromForm(e) {
      return e.target.closest('input, button, textarea, select, [contenteditable], .panel-card, .room-card');
    }

    function onMouseMove(e) {
      if (fromForm(e)) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function onClick(e) {
      if (fromForm(e)) return;
      burst = { x: e.clientX, y: e.clientY, radius: 10, strength: 55, speed: 8 };
    }

    function onKeyDown(e) {
      if (e.key === 'c' || e.key === 'C') {
        constellation = !constellation;
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        zIndex: -1, display: 'block',
      }}
    />
  );
}

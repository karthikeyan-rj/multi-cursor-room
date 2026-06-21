export function redraw(canvas, drawingsList, viewport) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (viewport) {
    ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawingsList.forEach(item => {
    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';

    if (item.eraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else if (item.type === 'text') {
      ctx.fillStyle = item.color;
      ctx.font = `${item.size}px sans-serif`;
      ctx.textBaseline = 'top';
      const lines = (item.text || '').split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, item.x, item.y + i * (item.size * 1.3));
      });
      return;
    } else {
      ctx.strokeStyle = item.color;
    }

    const size = item.size || item.width || 4;

    if (item.type === 'line') {
      if (!item.points || item.points.length < 2) return;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.moveTo(item.points[0].x, item.points[0].y);
      ctx.lineTo(item.points[1].x, item.points[1].y);
      ctx.stroke();
    } else if (item.type === 'rect') {
      ctx.lineWidth = size;
      ctx.strokeRect(item.x, item.y, item.w, item.h);
    } else if (item.type === 'circle') {
      ctx.lineWidth = size;
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      const rx = Math.abs(item.w) / 2;
      const ry = Math.abs(item.h) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      if (!item.points || item.points.length === 0) return;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y);
      }
      ctx.stroke();
    }
  });

  ctx.globalCompositeOperation = 'source-over';
}

export function drawShapePreview(ctx, type, x1, y1, x2, y2, color, size, viewport) {
  ctx.save();
  if (viewport) {
    ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.x, viewport.y);
  }
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';

  if (type === 'line') {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  } else if (type === 'rect') {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (type === 'circle') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

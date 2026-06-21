export function downloadBoardScreenshot(canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  ctx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download = 'cursor-room-board.png';
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

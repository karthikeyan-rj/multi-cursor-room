const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return SERVER_URL + url;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function isImageMime(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

export function getFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return '📝';
  return '📄';
}

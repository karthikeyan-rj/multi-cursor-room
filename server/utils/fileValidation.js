const DISALLOWED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi',
  '.js', '.html', '.htm', '.py', '.rb',
  '.ps1', '.jar', '.dll', '.app', '.com'
];

function isAllowedFileExtension(originalName) {
  const ext = '.' + (originalName.split('.').pop() || '').toLowerCase();
  return !DISALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 255);
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

module.exports = { isAllowedFileExtension, sanitizeFileName, MAX_FILE_SIZE };

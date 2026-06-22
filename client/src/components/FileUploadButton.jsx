import { useRef, useState } from 'react';
import { showToast } from '../utils/toast';
import { SERVER_URL } from '../config';
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'text/plain', 'text/markdown', 'text/csv',
  'application/json', 'application/pdf'
];
const DISALLOWED_EXTS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.js', '.html', '.htm', '.py', '.rb', '.ps1', '.jar', '.dll'];

export default function FileUploadButton({ roomId, onFileSent }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (DISALLOWED_EXTS.includes(ext)) {
      showToast('This file type is not allowed.', 'error');
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Unsupported file type. Allowed: images, text files, PDF.', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast('File too large. Maximum size is 10MB.', 'error');
      return;
    }

    const token = localStorage.getItem('cursor_room_token');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    fetch(`${SERVER_URL}/api/rooms/${roomId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          showToast('File sent!', 'success');
          onFileSent?.(data.file);
        } else {
          showToast(data.error || data.detail || 'Upload failed.', 'error');
        }
      })
      .catch(() => {
        showToast('Failed to upload file.', 'error');
      })
      .finally(() => setUploading(false));
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleSelect}
      />
      <button
        type="button"
        className="toolbar-btn file-upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Attach file"
      >
        {uploading ? (
          <span style={{ fontSize: '14px' }}>⏳</span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>
    </>
  );
}

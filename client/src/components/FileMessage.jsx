import { getFileUrl, formatFileSize, isImageMime, getFileIcon } from '../utils/fileUtils';

export default function FileMessage({ msg }) {
  const fileUrl = getFileUrl(msg.url);
  const isImage = isImageMime(msg.mime_type);

  const handleOpen = () => {
    if (fileUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="file-message" onClick={handleOpen}>
      {isImage ? (
        <img
          className="file-message-thumb"
          src={fileUrl}
          alt={msg.file_name}
          loading="lazy"
        />
      ) : (
        <div className="file-message-icon">
          {getFileIcon(msg.mime_type)}
        </div>
      )}
      <div className="file-message-info">
        <div className="file-message-name">{msg.file_name}</div>
        <div className="file-message-meta">
          {msg.mime_type?.split('/').pop().toUpperCase()} · {formatFileSize(msg.size)}
        </div>
      </div>
      <button
        className="file-message-download"
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}
        title="Open file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}

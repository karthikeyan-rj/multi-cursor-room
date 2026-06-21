import { getFileUrl, formatFileSize, isImageMime, getFileIcon } from '../utils/fileUtils';

export default function FileMessage({ msg }) {
  const fileUrl = getFileUrl(msg.fileUrl || msg.url);
  const displayName = msg.fileName || msg.file_name || msg.original_name || 'Untitled';
  const displayType = msg.fileType || msg.mime_type;
  const displaySize = msg.fileSize || msg.size;
  const isImage = isImageMime(displayType);
  const hasUrl = !!fileUrl;

  const handleOpen = () => {
    if (hasUrl) window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`file-message ${!hasUrl ? 'file-message--broken' : ''}`} onClick={handleOpen}>
      {isImage && hasUrl ? (
        <img
          className="file-message-thumb"
          src={fileUrl}
          alt={displayName}
          loading="lazy"
        />
      ) : (
        <div className="file-message-icon">
          {getFileIcon(displayType, hasUrl)}
        </div>
      )}
      <div className="file-message-info">
        <div className="file-message-name">{displayName}</div>
        <div className="file-message-meta">
          {displayType ? displayType.split('/').pop().toUpperCase() : 'FILE'}
          {displaySize ? ` · ${formatFileSize(displaySize)}` : ''}
          {!hasUrl ? ' · Unavailable' : ''}
        </div>
      </div>
      {hasUrl && (
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
      )}
    </div>
  );
}

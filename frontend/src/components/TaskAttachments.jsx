import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useRole } from '../context/AuthContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskAttachments({
  taskId = null,
  pendingFiles = [],
  onPendingFilesChange,
}) {
  const { canManageTasks } = useRole();
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(Boolean(taskId));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadAttachments = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const response = await api.getAttachments(taskId);
      setAttachments(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large (max 5 MB)`;
    }
    return null;
  };

  const handleFileSelect = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;

    const validationError = selected.map(validateFile).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!taskId) {
      onPendingFilesChange?.([...pendingFiles, ...selected]);
      setError('');
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (const file of selected) {
        await api.uploadAttachment(taskId, file);
      }
      await loadAttachments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePendingFile = (index) => {
    onPendingFilesChange?.(pendingFiles.filter((_, i) => i !== index));
  };

  const handleDownload = async (attachment) => {
    try {
      await api.downloadAttachment(attachment.id, attachment.file_name);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this file?')) return;
    try {
      await api.deleteAttachment(id);
      await loadAttachments();
    } catch (err) {
      setError(err.message);
    }
  };

  const showPicker = taskId || onPendingFilesChange;

  return (
    <section className="attachments">
      <h3>Attachments</h3>
      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <p className="muted">Loading attachments…</p>
      ) : (
        <>
          {attachments.length > 0 && (
            <ul className="attachment-list">
              {attachments.map((attachment) => (
                <li key={attachment.id}>
                  <div className="attachment-list__info">
                    <strong>{attachment.file_name}</strong>
                    <span className="muted">
                      {formatFileSize(attachment.file_size)}
                      {attachment.uploaded_by_name ? ` · ${attachment.uploaded_by_name}` : ''}
                    </span>
                  </div>
                  <div className="attachment-list__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => handleDownload(attachment)}
                    >
                      Download
                    </button>
                    {canManageTasks && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => handleDelete(attachment.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!taskId && pendingFiles.length > 0 && (
            <ul className="attachment-list">
              {pendingFiles.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <div className="attachment-list__info">
                    <strong>{file.name}</strong>
                    <span className="muted">{formatFileSize(file.size)} · ready to upload</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => removePendingFile(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {taskId && attachments.length === 0 && !uploading && (
            <p className="muted">No files attached yet.</p>
          )}
        </>
      )}

      {showPicker && (
        <div className="attachment-picker">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="attachment-picker__input"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : taskId ? 'Add files from your PC' : 'Choose files from your PC'}
          </button>
          <span className="muted attachment-picker__hint">Max 5 MB per file</span>
        </div>
      )}
    </section>
  );
}

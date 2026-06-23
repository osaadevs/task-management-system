import { useEffect, useState } from 'react';
import { api } from '../api';
import { useRole } from '../context/AuthContext';

export default function CommentSection({ taskId }) {
  const { canManageTasks } = useRole();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadComments = async () => {
    try {
      const response = await api.getComments(taskId);
      setComments(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [taskId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;

    try {
      await api.addComment({
        task_id: taskId,
        content: content.trim(),
      });
      setContent('');
      await loadComments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    try {
      await api.deleteComment(id);
      await loadComments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="comments">
      <h3>Comments</h3>
      {error && <div className="alert alert--error">{error}</div>}
      {loading ? (
        <p className="muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="muted">No comments yet.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id}>
              <div>
                <strong>{comment.user_name || `User ${comment.user_id}`}</strong>
                <p>{comment.comment_text || comment.content}</p>
              </div>
              {canManageTasks && (
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => handleDelete(comment.id)}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={handleSubmit}>
        <textarea
          rows={3}
          placeholder="Add a comment…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button type="submit" className="btn btn--primary btn--small">
          Post Comment
        </button>
      </form>
    </section>
  );
}

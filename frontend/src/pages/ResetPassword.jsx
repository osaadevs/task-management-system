import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { mustResetPassword, clearMustReset } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!mustResetPassword) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(password);
      clearMustReset();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card auth-card--narrow auth-form" onSubmit={handleSubmit}>
        <h1>Reset your password</h1>
        <p className="muted">This is your first login. Please set a new password to continue.</p>
        {error && <div className="alert alert--error">{error}</div>}

        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>

        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

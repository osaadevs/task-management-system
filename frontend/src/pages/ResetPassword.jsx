import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AuthBackground from '../components/AuthBackground';
import ThemeToggle from '../components/ThemeToggle';

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

  const passwordError =
    password.length > 0 && password.length < 8 ? 'Must be at least 8 characters.' : '';
  const confirmError =
    confirm.length > 0 && confirm !== password ? 'Passwords do not match.' : '';

  return (
    <div className="auth-page auth-page--animated">
      <AuthBackground />
      <div className="auth-page__toolbar">
        <ThemeToggle className="theme-switch--floating" />
      </div>
      <form className="auth-card auth-card--narrow auth-card--centered auth-card--glass auth-form" onSubmit={handleSubmit}>
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
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? 'reset-password-error' : undefined}
          />
          {passwordError && (
            <span className="field-error" id="reset-password-error">{passwordError}</span>
          )}
        </label>

        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            aria-invalid={Boolean(confirmError)}
            aria-describedby={confirmError ? 'reset-confirm-error' : undefined}
          />
          {confirmError && (
            <span className="field-error" id="reset-confirm-error">{confirmError}</span>
          )}
        </label>

        <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AuthBackground from '../components/AuthBackground';
import ThemeToggle from '../components/ThemeToggle';
import { passwordError as getPasswordError, PASSWORD_REGEX } from '../utils/passwordPolicy';

export default function ResetPassword() {
  const { isAuthenticated, mustResetPassword, clearMustReset } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // FE-3: this route requires an authenticated (reset-pending) session — send
  // unauthenticated visitors to login rather than rendering the form.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!mustResetPassword) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(password)) {
      setError('Use 8+ characters with upper, lower, a number, and a symbol.');
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

  const passwordError = getPasswordError(password); // FE-7: mirror full complexity policy
  const confirmError =
    confirm.length > 0 && confirm !== password ? 'Passwords do not match.' : '';

  return (
    <div className="auth-page auth-page--animated">
      <AuthBackground />
      <div className="auth-page__toolbar">
        <ThemeToggle className="theme-switch--floating" />
      </div>
      <form className="auth-card auth-card--narrow auth-card--centered auth-card--glass auth-form" onSubmit={handleSubmit}>
        <h1>Set a new password</h1>
        <p className="muted">
          Use a strong password you have not used before. This is required after your first login or a temporary password reset.
        </p>
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

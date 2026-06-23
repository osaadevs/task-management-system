import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AuthBackground from '../components/AuthBackground';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email.trim(), password);
      login({
        token: response.token,
        user: response.user,
        mustResetPassword: response.mustResetPassword,
      });

      if (response.mustResetPassword) {
        navigate('/reset-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--animated">
      <AuthBackground />
      <div className="auth-page__toolbar">
        <ThemeToggle className="theme-toggle--floating" />
      </div>
      <div className="auth-card auth-card--centered auth-card--glass">
        <div className="auth-card__brand">
          <span className="auth-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
              <path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <h1>Taskora</h1>
          <p className="muted">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form auth-form--stacked">
          {error && <div className="alert alert--error">{error}</div>}

          <label className="field">
            <span>Work Email</span>
            <div className="field__input-wrap">
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
              <span className="field__icon" aria-hidden="true">
                ✉
              </span>
            </div>
          </label>

          <label className="field">
            <span className="field__label-row">
              <span>Password</span>
            </span>
            <div className="field__input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="field__icon field__icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember this device
          </label>

          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="auth-footer-note">
          <span aria-hidden="true">ⓘ</span> Access is managed by your administrator
        </p>
      </div>

      <footer className="auth-page-footer">
        <span>Privacy Policy</span>
        <span>Terms of Service</span>
        <span>Help Center</span>
      </footer>
    </div>
  );
}

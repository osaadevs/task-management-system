import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import AuthBackground from '../components/AuthBackground';
import ThemeToggle from '../components/ThemeToggle';
import { EyeIcon, EyeOffIcon, MailIcon, InfoIcon } from '../components/Icons';
import { clearStoredAuth, getRememberedAuth, getValidStoredAuth, restoreRememberedAuth } from '../utils/authStorage';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const rememberedAuth = getRememberedAuth();

  useEffect(() => {
    const validAuth = getValidStoredAuth();
    if (validAuth) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

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
      }, { remember });

      if (response.mustResetPassword) {
        navigate('/reset-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      const message =
        err.message === 'Invalid email or password'
          ? 'Invalid email or password. If you used Forgot password recently, sign in with the temporary password from your email.'
          : err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSession = () => {
    const restored = restoreRememberedAuth();
    if (!restored) return;
    login(restored, { remember: true });
    if (restored.mustResetPassword) {
      navigate('/reset-password');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="auth-page auth-page--animated">
      <AuthBackground />
      <div className="auth-page__toolbar">
        <ThemeToggle className="theme-switch--floating" />
      </div>
      <div className="auth-card auth-card--centered auth-card--glass">
        <div className="auth-card__brand">
          <span className="auth-logo" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path
                d="M30 28V12C30 10.8954 29.1046 10 28 10H27.8994C27.369 10 26.8604 10.2109 26.4854 10.5859L10.5859 26.4854C10.2109 26.8604 10 27.369 10 27.8994V40H0V27.8994C2.15312e-05 24.7168 1.26423 21.6645 3.51465 19.4141L19.4141 3.51465C21.6645 1.26423 24.7168 2.1373e-05 27.8994 0H28C34.6274 0 40 5.37258 40 12V28C40 34.6274 34.6274 40 28 40H14V30H28C29.1046 30 30 29.1046 30 28ZM0 0H17L7 10H0V0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <h1>Taskora</h1>
          <p className="muted">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form auth-form--stacked">
          {error && <div className="alert alert--error">{error}</div>}

          {rememberedAuth && (
            <div className="auth-hint auth-hint--box">
              <p style={{ margin: '0 0 10px' }}>
                Saved sign-in for <strong>{rememberedAuth.user?.email}</strong> on this device.
              </p>
              <button type="button" className="btn btn--ghost btn--full" onClick={handleRestoreSession}>
                Continue as {rememberedAuth.user?.name}
              </button>
            </div>
          )}

          <label className="field" htmlFor="email">
            <span>Work Email</span>
            <div className="field__input-wrap">
              <input
                id="email"
                name="email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="username"
                required
              />
              <span className="field__icon" aria-hidden="true">
                <MailIcon size={16} />
              </span>
            </div>
          </label>

          <label className="field" htmlFor="password">
            <span className="field__label-row">
              <span>Password</span>
              <Link to="/forgot-password" className="auth-link auth-link--inline">
                Forgot password?
              </Link>
            </span>
            <div className="field__input-wrap">
              <input
                id="password"
                name="password"
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
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me on this device
          </label>

          <p className="auth-hint">
            Each browser tab can stay signed in to a different account.
          </p>

          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="auth-footer-note">
          <span aria-hidden="true" className="auth-footer-note__icon"><InfoIcon size={14} /></span> Access is managed by your administrator
        </p>
      </div>
    </div>
  );
}

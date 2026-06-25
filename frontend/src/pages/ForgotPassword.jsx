import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AuthBackground from '../components/AuthBackground';
import ThemeToggle from '../components/ThemeToggle';
import { MailIcon, UserIcon } from '../components/Icons';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.forgotPassword(identifier.trim());
      setMessage(response.message);
      setSent(true);
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
        <ThemeToggle className="theme-switch--floating" />
      </div>

      <div className="auth-card auth-card--centered auth-card--glass auth-card--narrow">
        <div className="auth-card__brand">
          <span className="auth-logo" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path
                d="M30 28V12C30 10.8954 29.1046 10 28 10H27.8994C27.369 10 26.8604 10.2109 26.4854 10.5859L10.5859 26.4854C10.2109 26.8604 10 27.369 10 27.8994V40H0V27.8994C2.15312e-05 24.7168 1.26423 21.6645 3.51465 19.4141L19.4141 3.51465C21.6645 1.26423 24.7168 2.1373e-05 27.8994 0H28C34.6274 0 40 5.37258 40 12V28C40 34.6274 34.6274 40 28 40H14V30H28C29.1046 30 30 29.1046 30 28ZM0 0H17L7 10H0V0Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <h1>Forgot password?</h1>
          <p className="muted">Enter the work email or full name on your Taskora account.</p>
        </div>

        {sent ? (
          <div className="forgot-password-success">
            {message && <div className="alert alert--success">{message}</div>}
            <ol className="forgot-password-steps">
              <li>Check the inbox for the email saved on your Taskora account (and spam/junk).</li>
              <li>
                <Link to="/login" className="auth-link">
                  Sign in
                </Link>{' '}
                with the temporary password from that email.
              </li>
              <li>You&apos;ll be asked to choose a new password right away.</li>
            </ol>
            <p className="auth-hint auth-hint--box">
              No email? Check spam/junk. If you saw a red error above, Resend may not be configured on Render yet.
              Gmail addresses need the domain <strong>vendra.best</strong> verified in Resend.
            </p>
            <Link to="/login" className="btn btn--primary btn--full">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form auth-form--stacked">
            {error && <div className="alert alert--error">{error}</div>}

            <label className="field">
              <span>Work email or name</span>
              <div className="field__input-wrap">
                <input
                  type="text"
                  className="input-field"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@company.com or Sarah Johnson"
                  autoComplete="username"
                  required
                />
                <span className="field__icon" aria-hidden="true">
                  {identifier.includes('@') ? <MailIcon size={16} /> : <UserIcon size={16} />}
                </span>
              </div>
            </label>

            <p className="auth-hint auth-hint--box">
              We email the temporary password to the address saved on your account — not necessarily the text you type here if you enter your name.
              You must set a new password after signing in.
            </p>

            <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
              {loading ? 'Sending…' : 'Send temporary password'}
            </button>

            <p className="auth-form-footer">
              <Link to="/login" className="auth-link">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

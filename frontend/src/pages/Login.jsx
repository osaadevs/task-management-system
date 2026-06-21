import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__hero">
          <span className="navbar__logo">TMS</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage tasks, collaborate with your team, and track progress in real time.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Login</h2>
          {error && <div className="alert alert--error">{error}</div>}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@tms.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="auth-hint">
            Demo users from seed data: <code>sarah.j@tms.com</code>, <code>emily.r@tms.com</code>
          </p>
        </form>
      </div>
    </div>
  );
}

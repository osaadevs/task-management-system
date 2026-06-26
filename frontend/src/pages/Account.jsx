import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';
import { MailIcon, UserIcon } from '../components/Icons';
import { scrollToElement } from '../utils/scrollToElement';
import { passwordError as getPasswordError } from '../utils/passwordPolicy';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleBadgeClass(role) {
  if (role === 'Admin') return 'role-badge--admin';
  if (role === 'Project Manager') return 'role-badge--pm';
  return 'role-badge--collab';
}

function profileFromAuth(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: true,
    created_at: null,
  };
}

export default function Account() {
  const { user, mustResetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(() => profileFromAuth(user));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const passwordFormRef = useRef(null);
  const alertRef = useRef(null);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.getProfile();
      setProfile(response.data);
    } catch {
      setProfile(profileFromAuth(user));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProfile(profileFromAuth(user));
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (changingPassword && passwordFormRef.current) {
      scrollToElement(passwordFormRef.current, { block: 'center' });
    }
  }, [changingPassword]);

  useEffect(() => {
    if (error || message) {
      scrollToElement(alertRef.current, { block: 'nearest', focus: false });
    }
  }, [error, message]);

  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  const newPasswordError = getPasswordError(newPassword);

  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== newPassword
      ? 'Passwords do not match.'
      : '';

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPasswordError || confirmError) return;

    setSaving(true);
    try {
      const response = await api.changePassword(currentPassword, newPassword);
      setMessage(response.message || 'Password updated successfully.');
      resetPasswordForm();
      setActiveTab('security');
    } catch (err) {
      const message =
        err.message === 'Route not found'
          ? 'Password change is not available yet. Deploy the latest backend to enable this feature.'
          : err.message;
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-page page-enter">
      <header className="page-header page-header--hero">
        <div>
          <h1>My Account</h1>
          <p className="muted">View your profile and manage account security.</p>
        </div>
      </header>

      <div className="account-tabs" role="tablist" aria-label="Account sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`role-filter account-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setError('');
              setMessage('');
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div ref={alertRef} className="alert alert--error">
          {error}
        </div>
      )}
      {message && (
        <div ref={alertRef} className="alert alert--success">
          {message}
        </div>
      )}

      {loading && !profile ? (
        <p className="muted">Loading your account…</p>
      ) : (
        <>
          {activeTab === 'profile' && profile && (
            <section className="panel account-profile scroll-target" role="tabpanel">
              <div className="account-profile__header">
                <span className="account-profile__avatar">{getInitials(profile.name)}</span>
                <div>
                  <h2>{profile.name}</h2>
                  <span className={`role-badge ${roleBadgeClass(profile.role)}`}>{profile.role}</span>
                </div>
              </div>

              <dl className="account-details">
                <div className="account-details__row">
                  <dt>
                    <UserIcon size={16} />
                    Full name
                  </dt>
                  <dd>{profile.name}</dd>
                </div>
                <div className="account-details__row">
                  <dt>
                    <MailIcon size={16} />
                    Email
                  </dt>
                  <dd>{profile.email}</dd>
                </div>
                <div className="account-details__row">
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`status-pill ${
                        profile.is_active ? 'status-pill--active' : 'status-pill--inactive'
                      }`}
                    >
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
                {profile.created_at && (
                  <div className="account-details__row">
                    <dt>Member since</dt>
                    <dd>{new Date(profile.created_at).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="account-security" role="tabpanel">
              <div className="panel account-security__card">
                <h3>Password</h3>
                <p className="muted account-security__hint">
                  Your password is hidden for security and cannot be viewed.
                </p>
                <div className="account-password-mask" aria-label="Password hidden">
                  <span className="account-password-mask__dots" aria-hidden="true">
                    ••••••••••••
                  </span>
                  <span className="muted">Encrypted</span>
                </div>
                {!changingPassword ? (
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      setChangingPassword(true);
                      setError('');
                      setMessage('');
                    }}
                  >
                    Change password
                  </button>
                ) : (
                  <form
                    ref={passwordFormRef}
                    className="account-password-form scroll-target panel--editing"
                    onSubmit={handlePasswordSubmit}
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                  >
                    <h4>Change password</h4>
                    <p className="muted">
                      Enter your current password to confirm it&apos;s you.
                    </p>

                    <PasswordField
                      id="account-verify-input"
                      label="Current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      preventAutofill
                      required
                    />
                    <PasswordField
                      id="account-set-input-a"
                      label="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      preventAutofill
                      required
                      error={newPasswordError}
                    />
                    <PasswordField
                      id="account-set-input-b"
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      preventAutofill
                      required
                      error={confirmError}
                    />

                    <div className="form-actions-inline">
                      <button type="submit" className="btn btn--primary" disabled={saving}>
                        {saving ? 'Updating…' : 'Update password'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={resetPasswordForm}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

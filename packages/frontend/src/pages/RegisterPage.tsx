/**
 * Registration creates a new tenant + user (Assumption A1).
 * tenantName is the name of the organization that owns this workspace.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(tenantName, email, displayName, password);
      navigate('/settings/jira');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">IdentityHub</h1>
        <p className="auth-subtitle">Create your workspace</p>

        <form onSubmit={handleSubmit} className="form">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="field">
            <label className="label" htmlFor="tenantName">
              Organization name
            </label>
            <input
              id="tenantName"
              type="text"
              className="input"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Acme Corp"
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="displayName">
              Your name
            </label>
            <input
              id="displayName"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Password
              <span className="label-hint">minimum 8 characters</span>
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating workspace…' : 'Create workspace'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

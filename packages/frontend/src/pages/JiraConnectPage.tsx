import { useState, useEffect, type FormEvent } from 'react';
import { useJira } from '../hooks/useJira';
import { ApiError } from '../api/client';

export function JiraConnectPage() {
  const { connection, loading, error, loadConnection, connect, disconnect } = useJira();

  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const handleConnect = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await connect(jiraBaseUrl.trim(), jiraEmail.trim(), apiToken.trim());
      setSuccess('Jira connected successfully.');
      setApiToken(''); // Clear the secret from form state
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Failed to connect. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Jira? You will need to reconnect to create tickets.')) return;
    setFormError(null);
    setSuccess(null);
    try {
      await disconnect();
      setSuccess('Jira disconnected.');
      setJiraBaseUrl('');
      setJiraEmail('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Jira Integration</h2>
        <p className="page-description">
          Connect your Atlassian Jira workspace to create NHI finding tickets.
          Your API token is encrypted at rest and never returned to the client.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {formError && <div className="alert alert-error">{formError}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && !connection ? (
        <div className="loading-text">Loading…</div>
      ) : (
        <>
          {connection?.connected && (
            <div className="info-card">
              <div className="info-card-label">Connected workspace</div>
              <div className="info-card-value">{connection.jiraBaseUrl}</div>
              <div className="info-card-label" style={{ marginTop: '0.5rem' }}>Account</div>
              <div className="info-card-value">{connection.jiraEmail}</div>
              <button
                className="btn btn-danger"
                style={{ marginTop: '1rem' }}
                onClick={handleDisconnect}
                disabled={loading}
              >
                Disconnect
              </button>
            </div>
          )}

          <form onSubmit={handleConnect} className="form">
            <h3>{connection?.connected ? 'Update connection' : 'Connect Jira'}</h3>

            <div className="field">
              <label className="label" htmlFor="jiraBaseUrl">
                Jira base URL
              </label>
              <input
                id="jiraBaseUrl"
                type="url"
                className="input"
                value={jiraBaseUrl}
                onChange={(e) => setJiraBaseUrl(e.target.value)}
                placeholder="https://your-org.atlassian.net"
                required
              />
              <span className="field-hint">Must be an Atlassian Cloud URL (*.atlassian.net)</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="jiraEmail">
                Jira account email
              </label>
              <input
                id="jiraEmail"
                type="email"
                className="input"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="apiToken">
                API token
                <span className="label-hint">
                  Generate at{' '}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Atlassian account settings
                  </a>
                </span>
              </label>
              <input
                id="apiToken"
                type="password"
                className="input"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Connecting…' : connection?.connected ? 'Update' : 'Connect'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

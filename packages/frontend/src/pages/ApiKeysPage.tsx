/**
 * API key management page.
 * (A6) Keys are generated once and the raw value is returned once.
 * After dismissing the confirmation dialog, the key cannot be retrieved.
 */
import { useState, useEffect, type FormEvent } from 'react';
import { apiKeysApi, type ApiKeyInfo, type ApiKeyCreated, ApiError } from '../api/client';

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const data = await apiKeysApi.list();
      setKeys(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keys');
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const created = await apiKeysApi.create({ label });
      setNewKey(created);
      setLabel('');
      await loadKeys();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create API key');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>API Keys</h2>
        <p className="page-description">
          Generate API keys for external systems (CI/CD pipelines, scanners) to create tickets
          programmatically via <code>POST /api/v1/tickets</code>.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {newKey && (
        <div className="alert alert-success">
          <strong>API key created. Copy it now — it will not be shown again.</strong>
          <div className="key-display">
            <code className="key-value">{newKey.rawKey}</code>
            <button className="btn btn-ghost" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button className="btn-link" onClick={() => setNewKey(null)}>
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="form" style={{ maxWidth: '480px' }}>
        <h3>Generate new key</h3>
        <div className="field">
          <label className="label" htmlFor="label">
            Label
          </label>
          <input
            id="label"
            type="text"
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. "prod-scanner", "github-actions"'
            required
            maxLength={100}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Generating…' : 'Generate key'}
        </button>
      </form>

      {keys.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Existing keys</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Prefix</th>
                  <th>Created</th>
                  <th>Last used</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.label}</td>
                    <td>
                      <code>{k.keyPrefix}…</code>
                    </td>
                    <td className="date-cell">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="date-cell">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

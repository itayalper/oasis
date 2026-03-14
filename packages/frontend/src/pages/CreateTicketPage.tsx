import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { ProjectSelector } from '../components/ProjectSelector';
import { ApiError } from '../api/client';

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const;
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

export function CreateTicketPage() {
  const { createTicket, loading } = useTickets();
  const navigate = useNavigate();

  const [project, setProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string>('HIGH');
  const [priority, setPriority] = useState<string>('High');
  const [labelsInput, setLabelsInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors([]);

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const ticket = await createTicket({
        project,
        title,
        description,
        severity,
        priority,
        labels,
        dueDate: dueDate || undefined,
      });
      navigate(`/tickets?project=${encodeURIComponent(ticket.jiraProjectKey)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          setFieldErrors(err.details);
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Create NHI Finding Ticket</h2>
        <p className="page-description">
          Report a Non-Human Identity security finding to your Jira workspace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form form-wide">
        {error && <div className="alert alert-error">{error}</div>}
        {fieldErrors.length > 0 && (
          <div className="alert alert-error">
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {fieldErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="project">
            Jira project <span className="required">*</span>
          </label>
          <ProjectSelector value={project} onChange={setProject} disabled={loading} />
        </div>

        <div className="field">
          <label className="label" htmlFor="title">
            Title (summary) <span className="required">*</span>
          </label>
          <input
            id="title"
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Stale Service Account: svc-deploy-prod"'
            required
            maxLength={255}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="description">
            Description <span className="required">*</span>
          </label>
          <textarea
            id="description"
            className="input textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the finding, affected resources, and recommended remediation…"
            required
            rows={5}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label className="label" htmlFor="severity">
              Severity <span className="required">*</span>
            </label>
            <select
              id="severity"
              className="input"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="field-hint">Stored as a Jira label (severity:HIGH)</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="priority">
              Priority <span className="required">*</span>
            </label>
            <select
              id="priority"
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span className="field-hint">Maps to Jira's native priority field</span>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="labels">
            Labels
          </label>
          <input
            id="labels"
            type="text"
            className="input"
            value={labelsInput}
            onChange={(e) => setLabelsInput(e.target.value)}
            placeholder="stale-account, expiring-credential, overprivileged"
          />
          <span className="field-hint">Comma-separated. Optional.</span>
        </div>

        <div className="field">
          <label className="label" htmlFor="dueDate">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            className="input input-date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <span className="field-hint">Optional. Useful for SLA-driven remediation.</span>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || !project}>
            {loading ? 'Creating…' : 'Create ticket'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/tickets')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

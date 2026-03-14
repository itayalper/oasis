import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import { ProjectSelector } from '../components/ProjectSelector';

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
  INFORMATIONAL: 'badge-info',
};

export function RecentTicketsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tickets, loading, error, loadRecent } = useTickets();

  const [selectedProject, setSelectedProject] = useState(searchParams.get('project') ?? '');

  // Load tickets whenever project changes
  useEffect(() => {
    if (selectedProject) {
      void loadRecent(selectedProject);
    }
  }, [selectedProject, loadRecent]);

  const handleProjectChange = (key: string) => {
    setSelectedProject(key);
    if (key) {
      navigate(`/tickets?project=${encodeURIComponent(key)}`, { replace: true });
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Recent Tickets</h2>
          <p className="page-description">The 10 most recent NHI finding tickets created from this app.</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          + New Ticket
        </Link>
      </div>

      <div className="field" style={{ maxWidth: '360px', marginBottom: '1.5rem' }}>
        <label className="label">Filter by project</label>
        <ProjectSelector value={selectedProject} onChange={handleProjectChange} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!selectedProject && (
        <div className="empty-state">Select a project above to view recent tickets.</div>
      )}

      {selectedProject && loading && (
        <div className="loading-text">Loading tickets…</div>
      )}

      {selectedProject && !loading && tickets.length === 0 && !error && (
        <div className="empty-state">
          No tickets found for <strong>{selectedProject}</strong>.{' '}
          <Link to="/tickets/new">Create the first one.</Link>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <a
                      href={ticket.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="jira-key"
                    >
                      {ticket.jiraIssueKey}
                    </a>
                  </td>
                  <td>
                    <a
                      href={ticket.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ticket-title"
                    >
                      {ticket.title}
                    </a>
                  </td>
                  <td>
                    <span className={`badge ${SEVERITY_BADGE[ticket.severity] ?? 'badge-info'}`}>
                      {ticket.severity}
                    </span>
                  </td>
                  <td>{ticket.priority}</td>
                  <td className="date-cell">
                    {new Date(ticket.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

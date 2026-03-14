import { useEffect } from 'react';
import { useJira } from '../hooks/useJira';
import type { JiraProject } from '../api/client';

interface Props {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}

export function ProjectSelector({ value, onChange, disabled }: Props) {
  const { projects, loading, error, loadProjects } = useJira();

  // Load from cache (or fetch) on first render
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  if (error) {
    return (
      <div className="field-error">
        Could not load projects: {error}
        <button type="button" className="btn-link" onClick={() => loadProjects(true)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
      >
        <option value="">{loading ? 'Loading projects…' : 'Select a project'}</option>
        {projects.map((p: JiraProject) => (
          <option key={p.key} value={p.key}>
            {p.name} ({p.key})
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => loadProjects(true)}
        disabled={loading}
        title="Refresh project list"
      >
        ↻
      </button>
    </div>
  );
}

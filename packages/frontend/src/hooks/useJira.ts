import { useState, useCallback } from 'react';
import { jiraApi, type JiraConnectionInfo, type JiraProject } from '../api/client';

const PROJECTS_CACHE_KEY = 'jira_projects';

export function useJira() {
  const [connection, setConnection] = useState<JiraConnectionInfo | null>(null);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const info = await jiraApi.getConnection();
      setConnection(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Jira connection');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Loads projects from sessionStorage cache or fetches from the server.
   * (A7) The cache is busted by the "Refresh" button or on Jira connect/disconnect.
   */
  const loadProjects = useCallback(async (force = false) => {
    if (!force) {
      const cached = sessionStorage.getItem(PROJECTS_CACHE_KEY);
      if (cached) {
        try {
          setProjects(JSON.parse(cached) as JiraProject[]);
          return;
        } catch {
          // corrupt cache — fall through to fetch
        }
      }
    }

    setLoading(true);
    setError(null);
    try {
      const data = await jiraApi.getProjects();
      setProjects(data);
      sessionStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Jira projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const connect = useCallback(
    async (jiraBaseUrl: string, jiraEmail: string, apiToken: string) => {
      setLoading(true);
      setError(null);
      try {
        await jiraApi.connect({ jiraBaseUrl, jiraEmail, apiToken });
        sessionStorage.removeItem(PROJECTS_CACHE_KEY);
        const info = await jiraApi.getConnection();
        setConnection(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect Jira');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await jiraApi.disconnect();
      sessionStorage.removeItem(PROJECTS_CACHE_KEY);
      setConnection({ connected: false });
      setProjects([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Jira');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { connection, projects, loading, error, loadConnection, loadProjects, connect, disconnect };
}

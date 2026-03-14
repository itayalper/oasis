import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';
import { useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('Logout failed:', err.message);
      }
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="layout">
      <header className="nav">
        <div className="nav-brand">
          <Link to="/tickets">IdentityHub</Link>
        </div>
        <nav className="nav-links">
          <Link to="/tickets/new">New Ticket</Link>
          <Link to="/tickets">Recent Tickets</Link>
          <Link to="/settings/jira">Jira Settings</Link>
          <Link to="/settings/apikeys">API Keys</Link>
        </nav>
        <div className="nav-user">
          <span className="nav-email">{user?.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}

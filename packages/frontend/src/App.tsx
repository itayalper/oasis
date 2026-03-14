import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { JiraConnectPage } from './pages/JiraConnectPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { RecentTicketsPage } from './pages/RecentTicketsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import './styles/global.css';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        path="/tickets/new"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateTicketPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <Layout>
              <RecentTicketsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/jira"
        element={
          <ProtectedRoute>
            <Layout>
              <JiraConnectPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/apikeys"
        element={
          <ProtectedRoute>
            <Layout>
              <ApiKeysPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}

export default function App() {
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

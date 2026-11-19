import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardShell from './pages/DashboardShell';
import FollowUpWorkspacePage from './pages/FollowUpWorkspacePage';
import ManageBatchesPage from './pages/ManageBatchesPage';
import ImportExportPage from './pages/ImportExportPage';
import SettingsPage from './pages/SettingsPage';
import AdminDirectoryPage from './pages/AdminDirectoryPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Loading portal...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/followup" replace />;

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/followup" replace />} />
            <Route path="followup" element={<FollowUpWorkspacePage />} />
            <Route path="manage-batches" element={<ManageBatchesPage />} />
            <Route path="import-export" element={<ImportExportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDirectoryPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
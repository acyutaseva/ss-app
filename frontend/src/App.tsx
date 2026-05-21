import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AttendancePage } from './pages/AttendancePage';
import { ReportsPage } from './pages/ReportsPage';
// import { AdminPage } from './pages/AdminPage';
import { StudentsPage } from './pages/StudentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { VolunteersPage } from './pages/VolunteersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { PublicEventReportPage } from './pages/PublicEventReportPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/report/:eventId" element={<PublicEventReportPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        {/* AdminPage route removed */}
        <Route
          path="students"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="volunteers"
          element={
            <ProtectedRoute roles={['admin']}>
              <VolunteersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="events"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <EventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['admin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute roles={['admin']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

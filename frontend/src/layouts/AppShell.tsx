import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  AttendanceIcon,
  StudentsIcon,
  VolunteersIcon,
  EventsIcon,
  ReportsIcon,
  AuditLogsIcon,
} from '../components/SidebarIcons';

export const AppShell = () => {
  const { user, logout } = useAuth();

  const navClass = ({ isActive }: { isActive: boolean }) => `nav-item${isActive ? ' active' : ''}`;

  return (
    <div className="page-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">ISKCON Perth</p>
          <h2>Hare Krishan Sunday School</h2>
        </div>
        <div className="app-header-actions">
          <p className="eyebrow">Role: {user?.role === 'admin' ? 'Admin' : 'Teacher'}</p>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <NavLink to="/" end className={navClass}>
              <DashboardIcon className="sidebar-nav-icon" />
              <span className="sidebar-nav-label">Dashboard</span>
            </NavLink>
            <NavLink to="/attendance" className={navClass}>
              <AttendanceIcon className="sidebar-nav-icon" />
              <span className="sidebar-nav-label">Attendance</span>
            </NavLink>
            <NavLink to="/students" className={navClass}>
              <StudentsIcon className="sidebar-nav-icon" />
              <span className="sidebar-nav-label">Students</span>
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/volunteers" className={navClass}>
                <VolunteersIcon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">Volunteers</span>
              </NavLink>
            )}
            <NavLink to="/events" className={navClass}>
              <EventsIcon className="sidebar-nav-icon" />
              <span className="sidebar-nav-label">Events</span>
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/reports" className={navClass}>
                <ReportsIcon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">Reports</span>
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/audit-logs" className={navClass}>
                <AuditLogsIcon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">Audit Logs</span>
              </NavLink>
            )}
          </nav>

        </aside>

        <main className="main-panel">
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <p>Hare Krishan Sunday School - ISKCON Perth</p>
      </footer>
    </div>
  );
};

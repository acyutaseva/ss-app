import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AppShell = () => {
  const { user, logout } = useAuth();

  const navClass = ({ isActive }: { isActive: boolean }) => `nav-item${isActive ? ' active' : ''}`;

  return (
    <div className="page-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Hare Krishan Sunday School</p>
          <h2>Student Management</h2>
        </div>
        <div className="app-header-actions">
          <p className="eyebrow">Role: {user?.role === 'admin' ? 'Admin' : 'Teacher'}</p>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <NavLink to="/" end className={navClass}>Dashboard</NavLink>
            <NavLink to="/students" className={navClass}>Students</NavLink>
            {user?.role === 'admin' && <NavLink to="/volunteers" className={navClass}>Volunteers</NavLink>}
            <NavLink to="/events" className={navClass}>Events</NavLink>
            <NavLink to="/attendance" className={navClass}>Attendance</NavLink>
            {/* Admin link removed */}
            {user?.role === 'admin' && <NavLink to="/reports" className={navClass}>Reports</NavLink>}
            {user?.role === 'admin' && <NavLink to="/audit-logs" className={navClass}>Audit Logs</NavLink>}
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

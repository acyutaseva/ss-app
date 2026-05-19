import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AppShell = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hare Krishan Sunday School</p>
          <h1>Attendance Console</h1>
        </div>
        <button className="btn ghost" onClick={logout}>Logout</button>
      </header>

      <nav className="tabs">
        <Link to="/">Dashboard</Link>
        {user?.role === 'admin' && <Link to="/students">Students</Link>}
        {user?.role === 'admin' && <Link to="/volunteers">Volunteers</Link>}
        <Link to="/attendance">Attendance</Link>
        {user?.role === 'admin' && <Link to="/events">Events</Link>}
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
        {user?.role === 'admin' && <Link to="/reports">Reports</Link>}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

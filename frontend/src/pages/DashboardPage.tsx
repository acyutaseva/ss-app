import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

type Summary = {
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  todayCheckedIn: number;
  todayCheckedOut: number;
  todayPendingPickup: number;
  birthdaysThisMonth: Array<{
    id: string;
    full_name: string;
    date_of_birth: string;
    group_name: string;
  }>;
};

const formatBirthday = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
};

export const DashboardPage = () => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [showBirthdays, setShowBirthdays] = useState(false);

  const load = async () => {
    if (!token) return;
    const data = await apiFetch<Summary>('/dashboard/summary', {}, token);
    setSummary(data);
  };

  useEffect(() => {
    load().catch(() => setError('Failed to load dashboard'));
  }, [token]);

  if (!summary) {
    return <section><div className="card"><p>{error || 'Loading dashboard...'}</p></div></section>;
  }

  return (
    <section className="dashboard-grid">
      <div className="card"><p className="eyebrow">Role</p><h2>{user?.role === 'admin' ? 'Admin View' : 'Teacher View'}</h2></div>
      <div className="card"><p className="eyebrow">Total Active Students</p><h2>{summary.totalStudents}</h2></div>
      <div className="card"><p className="eyebrow">Today Checked In</p><h2>{summary.todayCheckedIn}</h2></div>
      <div className="card"><p className="eyebrow">Today Checked Out</p><h2>{summary.todayCheckedOut}</h2></div>
      <div className="card"><p className="eyebrow">Pending Pickup</p><h2>{summary.todayPendingPickup}</h2></div>
      <div className="card"><p className="eyebrow">Fee Paid</p><h2>{summary.paidStudents}</h2></div>
      <div className="card"><p className="eyebrow">Fee Unpaid</p><h2>{summary.unpaidStudents}</h2></div>
      <div className="card clickable-card" onClick={() => setShowBirthdays(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowBirthdays(true); }}>
        <p className="eyebrow">Birthdays This Month</p>
        <h2>{summary.birthdaysThisMonth.length}</h2>
        <p>Click to view list</p>
      </div>

      {showBirthdays && (
        <div className="modal-backdrop" onClick={() => setShowBirthdays(false)}>
          <div className="modal-card birthday-modal" onClick={(e) => e.stopPropagation()}>
            <div className="birthday-modal-head">
              <div>
                <p className="eyebrow">Student List</p>
                <h2>Birthdays This Month</h2>
              </div>
              <button className="btn ghost" onClick={() => setShowBirthdays(false)}>Close</button>
            </div>
            {summary.birthdaysThisMonth.length ? (
              <div className="birthday-list">
                {summary.birthdaysThisMonth.map((s) => (
                  <div key={s.id} className="birthday-row">
                    <div>
                      <strong>{s.full_name}</strong>
                      <p className="eyebrow">{s.group_name}</p>
                    </div>
                    <span className="birthday-date">{formatBirthday(s.date_of_birth)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="birthday-empty">No birthdays in this month.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

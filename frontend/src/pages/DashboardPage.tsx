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
};

export const DashboardPage = () => {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');

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
    </section>
  );
};

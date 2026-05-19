import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

type Summary = {
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  totalPaymentReceived: number;
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

type EventOption = {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
};

type AttendanceStudentsResponse = {
  items: Array<{
    checkin_time?: string | null;
    checkout_time?: string | null;
  }>;
};

type EventStats = {
  totalStudents: number;
  checkedIn: number;
  checkedOut: number;
  pendingPickup: number;
};

const formatBirthday = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
};

const formatDateOnly = (value: string) => value?.includes('T') ? value.split('T')[0] : value;
const formatTimeOnly = (value: string) => value?.slice(0, 5) || value;
const formatAudAmount = (value: number) => `AUD ${value.toFixed(2)}`;

export const DashboardPage = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [eventStatsLoading, setEventStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBirthdays, setShowBirthdays] = useState(false);

  const loadSummary = async () => {
    if (!token) return;
    const data = await apiFetch<Summary>('/dashboard/summary', {}, token);
    setSummary(data);
  };

  const loadEvents = async () => {
    if (!token) return;
    const data = await apiFetch<EventOption[]>('/events', {}, token);
    setEvents(data);
    if (!data.length) {
      setSelectedEventId('');
      setEventStats(null);
      return;
    }
    setSelectedEventId((prev) => {
      if (prev && data.some((ev) => ev.id === prev)) return prev;
      return data[0].id;
    });
  };

  const loadEventStats = async (eventId: string) => {
    if (!token || !eventId) {
      setEventStats(null);
      return;
    }

    setEventStatsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('mode', 'attendance');
      params.set('eventId', eventId);
      params.set('page', '1');
      params.set('pageSize', '500');
      const data = await apiFetch<AttendanceStudentsResponse>(`/students?${params.toString()}`, {}, token);

      const checkedIn = data.items.filter((s) => Boolean(s.checkin_time)).length;
      const checkedOut = data.items.filter((s) => Boolean(s.checkout_time)).length;
      const pendingPickup = data.items.filter((s) => Boolean(s.checkin_time) && !s.checkout_time).length;

      setEventStats({
        totalStudents: data.items.length,
        checkedIn,
        checkedOut,
        pendingPickup
      });
    } finally {
      setEventStatsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadSummary(), loadEvents()]).catch(() => setError('Failed to load dashboard'));
  }, [token]);

  useEffect(() => {
    loadEventStats(selectedEventId).catch(() => setError('Failed to load event statistics'));
  }, [token, selectedEventId]);

  if (!summary) {
    return <section><div className="card"><p>{error || 'Loading dashboard...'}</p></div></section>;
  }

  return (
    <section className="dashboard-grid">
      <div className="card dashboard-span-full">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Event Statistics</p>
            <h2>Attendance by Event</h2>
          </div>
          <div style={{ minWidth: 280 }}>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
              <option value="">Select event</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({formatDateOnly(ev.event_date)} {formatTimeOnly(ev.start_time)}-{formatTimeOnly(ev.end_time)})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row wrap" style={{ marginTop: 10 }}>
          <p className="eyebrow">{eventStatsLoading ? 'Loading event statistics...' : 'Change event to view its statistics'}</p>
        </div>
        <div className="dashboard-grid" style={{ marginTop: 10 }}>
          <div className="card"><p className="eyebrow">Event Students</p><h2>{eventStats?.totalStudents ?? 0}</h2></div>
          <div className="card"><p className="eyebrow">Checked In</p><h2>{eventStats?.checkedIn ?? 0}</h2></div>
          <div className="card"><p className="eyebrow">Checked Out</p><h2>{eventStats?.checkedOut ?? 0}</h2></div>
          <div className="card"><p className="eyebrow">Pending Pickup</p><h2>{eventStats?.pendingPickup ?? 0}</h2></div>
        </div>
      </div>

      <div className="dashboard-two-col-grid dashboard-span-full">
        <div className="card">
          <div>
            <p className="eyebrow">Year Statistics</p>
            <h2>Payment</h2>
          </div>
          <div className="payment-sub-grid" style={{ marginTop: 10 }}>
            <div className="card"><p className="eyebrow">Paid</p><h2>{summary.paidStudents}</h2></div>
            <div className="card"><p className="eyebrow">Unpaid</p><h2>{summary.unpaidStudents}</h2></div>
            <div className="card"><p className="eyebrow">Received</p><h2>{formatAudAmount(summary.totalPaymentReceived || 0)}</h2></div>
          </div>
        </div>

        <div className="card">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Summary</h2>
          </div>
          <div className="summary-sub-grid" style={{ marginTop: 10 }}>
            <div className="card"><p className="eyebrow">Total Active Students</p><h2>{summary.totalStudents}</h2></div>
            <div className="card clickable-card" onClick={() => setShowBirthdays(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowBirthdays(true); }}>
              <p className="eyebrow">Birthdays This Month</p>
              <h2>{summary.birthdaysThisMonth.length}</h2>
              <p>Click to view list</p>
            </div>
          </div>
        </div>
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
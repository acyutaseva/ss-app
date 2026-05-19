import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  notes?: string | null;
};

type AttendanceRow = {
  full_name: string;
  group_name: string;
  checkin_time?: string | null;
  checkout_time?: string | null;
  dropped_by?: string | null;
  picked_by_name?: string | null;
  picked_by_type?: string | null;
  notes?: string | null;
};

export const EventsPage = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', eventDate: '', startTime: '09:00', endTime: '11:00', notes: '' });
  const [editForm, setEditForm] = useState<{ id: string; name: string; eventDate: string; startTime: string; endTime: string; notes: string } | null>(null);
  const formatDateOnly = (value: string) => value?.includes('T') ? value.split('T')[0] : value;

  const loadEvents = async () => {
    if (!token) return;
    const data = await apiFetch<EventRow[]>('/admin/events', {}, token);
    setEvents(data);
    if (!selectedEventId && data.length) setSelectedEventId(data[0].id);
  };

  const loadAttendance = async (eventId: string) => {
    if (!token || !eventId) return;
    const rows = await apiFetch<AttendanceRow[]>(`/admin/events/${eventId}/attendance`, {}, token);
    setAttendance(rows);
  };

  useEffect(() => {
    loadEvents().catch(() => setMsg('Failed to load events'));
  }, [token]);

  useEffect(() => {
    if (selectedEventId) loadAttendance(selectedEventId).catch(() => setMsg('Failed to load event attendance'));
  }, [selectedEventId]);

  const createEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(form) }, token);
    setMsg('Event created');
    setForm({ name: '', eventDate: '', startTime: '09:00', endTime: '11:00', notes: '' });
    await loadEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!token) return;
    await apiFetch(`/admin/events/${id}`, { method: 'DELETE' }, token);
    setMsg('Event deleted');
    if (selectedEventId === id) {
      setSelectedEventId('');
      setAttendance([]);
    }
    await loadEvents();
  };

  const saveEditEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editForm) return;
    await apiFetch(`/admin/events/${editForm.id}`, { method: 'PATCH', body: JSON.stringify(editForm) }, token);
    setMsg('Event updated');
    setEditForm(null);
    await loadEvents();
  };

  return (
    <section className="admin-grid">
      <form className="card form-grid" onSubmit={createEvent}>
        <h2>Create Event</h2>
        <input placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
        <div className="row">
          <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
        </div>
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="btn primary">Save Event</button>
        {msg && <p className="ok">{msg}</p>}
      </form>

      <div className="card">
        <h2>Events</h2>
        <div className="grid-list">
          {events.map((ev) => (
            <div key={ev.id} className="event-row">
              <div className="event-row-main">
                <h3>{ev.name}</h3>
                <p>{formatDateOnly(ev.event_date)} • {ev.start_time.slice(0, 5)}-{ev.end_time.slice(0, 5)}</p>
              </div>
              <div className="row wrap event-actions">
                <button className="btn ghost" onClick={() => setSelectedEventId(ev.id)}>View Attendance</button>
                <button className="btn ghost" onClick={() => setEditForm({
                  id: ev.id,
                  name: ev.name,
                  eventDate: formatDateOnly(ev.event_date),
                  startTime: ev.start_time.slice(0, 5),
                  endTime: ev.end_time.slice(0, 5),
                  notes: ev.notes || ''
                })}>Edit</button>
                <button className="btn warn" onClick={() => deleteEvent(ev.id).catch(() => setMsg('Delete failed'))}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editForm && (
        <form className="card form-grid" onSubmit={saveEditEvent}>
          <h2>Edit Event</h2>
          <input value={editForm.name} onChange={(e) => setEditForm((v) => v ? { ...v, name: e.target.value } : v)} required />
          <input type="date" value={editForm.eventDate} onChange={(e) => setEditForm((v) => v ? { ...v, eventDate: e.target.value } : v)} required />
          <div className="row">
            <input type="time" value={editForm.startTime} onChange={(e) => setEditForm((v) => v ? { ...v, startTime: e.target.value } : v)} required />
            <input type="time" value={editForm.endTime} onChange={(e) => setEditForm((v) => v ? { ...v, endTime: e.target.value } : v)} required />
          </div>
          <textarea value={editForm.notes} onChange={(e) => setEditForm((v) => v ? { ...v, notes: e.target.value } : v)} />
          <div className="row">
            <button className="btn primary">Save</button>
            <button type="button" className="btn ghost" onClick={() => setEditForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h2>Event Attendance Table</h2>
        <div className="row wrap">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            <option value="">Select event</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name} ({formatDateOnly(ev.event_date)})</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Group</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Dropped By</th>
                <th>Picked By</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((r, i) => (
                <tr key={`${r.full_name}-${i}`}>
                  <td>{r.full_name}</td>
                  <td>{r.group_name}</td>
                  <td>{r.checkin_time ? new Date(r.checkin_time).toLocaleString() : '-'}</td>
                  <td>{r.checkout_time ? new Date(r.checkout_time).toLocaleString() : '-'}</td>
                  <td>{r.dropped_by || '-'}</td>
                  <td>{r.picked_by_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

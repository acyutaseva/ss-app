import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  attendance_mode: 'full' | 'checkin_only';
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

type EventFormState = {
  name: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendanceMode: 'full' | 'checkin_only';
  notes: string;
};

type EditEventState = EventFormState & {
  id: string;
};

const toEventDateTime = (ev: EventRow) => {
  const iso = `${ev.event_date}T${ev.start_time}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const getNextUpcomingEventId = (rows: EventRow[]) => {
  const now = Date.now();
  let next: { id: string; time: number } | null = null;

  for (const ev of rows) {
    const dt = toEventDateTime(ev);
    if (!dt) continue;
    const time = dt.getTime();
    if (time < now) continue;
    if (!next || time < next.time) {
      next = { id: ev.id, time };
    }
  }

  return next?.id || '';
};

export const EventsPage = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState<EventFormState>({
    name: '',
    eventDate: '',
    startTime: '09:00',
    endTime: '11:00',
    attendanceMode: 'full',
    notes: ''
  });
  const [editForm, setEditForm] = useState<EditEventState | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<EventRow | null>(null);
  const eventsPageSize = 5;
  const attendancePageSize = 10;
  const formatDateOnly = (value: string) => value?.includes('T') ? value.split('T')[0] : value;
  const formatTimeOnly = (value: string) => value?.slice(0, 5) || value;

  const totalEventsPages = Math.max(1, Math.ceil(events.length / eventsPageSize));
  const totalAttendancePages = Math.max(1, Math.ceil(attendance.length / attendancePageSize));

  const eventsPageRows = useMemo(() => {
    const start = (eventsPage - 1) * eventsPageSize;
    return events.slice(start, start + eventsPageSize);
  }, [events, eventsPage]);

  const attendancePageRows = useMemo(() => {
    const start = (attendancePage - 1) * attendancePageSize;
    return attendance.slice(start, start + attendancePageSize);
  }, [attendance, attendancePage]);

  const toEventForm = (ev: EventRow): EditEventState => ({
    id: ev.id,
    name: ev.name,
    eventDate: formatDateOnly(ev.event_date),
    startTime: formatTimeOnly(ev.start_time),
    endTime: formatTimeOnly(ev.end_time),
    attendanceMode: ev.attendance_mode,
    notes: ev.notes || ''
  });

  const loadEvents = async () => {
    if (!token) return;
    const data = await apiFetch<EventRow[]>('/admin/events', {}, token);
    setEvents(data);
    if (!data.length) {
      setSelectedEventId('');
      setAttendance([]);
      return;
    }
    if (!selectedEventId || !data.find((e) => e.id === selectedEventId)) {
      const nextUpcomingEventId = getNextUpcomingEventId(data);
      setSelectedEventId(nextUpcomingEventId || data[0].id);
    }
  };

  const loadAttendance = async (eventId: string) => {
    if (!token || !eventId) return;
    const rows = await apiFetch<AttendanceRow[]>(`/admin/events/${eventId}/attendance`, {}, token);
    setAttendance(rows);
  };

  useEffect(() => {
    loadEvents().catch(() => setError('Failed to load events'));
  }, [token]);

  useEffect(() => {
    if (eventsPage > totalEventsPages) {
      setEventsPage(totalEventsPages);
    }
  }, [eventsPage, totalEventsPages]);

  useEffect(() => {
    if (selectedEventId) loadAttendance(selectedEventId).catch(() => setError('Failed to load event attendance'));
  }, [selectedEventId]);

  useEffect(() => {
    setAttendancePage(1);
  }, [selectedEventId]);

  useEffect(() => {
    if (attendancePage > totalAttendancePages) {
      setAttendancePage(totalAttendancePages);
    }
  }, [attendancePage, totalAttendancePages]);

  const validateEventForm = (v: EventFormState) => {
    const name = v.name.trim();
    if (name.length < 2) return 'Event name must be at least 2 characters.';
    if (!v.eventDate) return 'Please select an event date.';
    if (!v.startTime) return 'Please select a start time.';
    if (!v.endTime) return 'Please select an end time.';
    if (v.startTime >= v.endTime) return 'End time must be after start time.';
    return '';
  };

  const createEvent = async () => {
    if (!token) return;
    const validationError = validateEventForm(form);
    if (validationError) {
      setAddError(validationError);
      return;
    }

    await apiFetch('/admin/events', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        name: form.name.trim(),
        notes: form.notes.trim() || undefined
      })
    }, token);

    setMsg('Event created');
    setShowAddEvent(false);
    setAddError('');
    setForm({ name: '', eventDate: '', startTime: '09:00', endTime: '11:00', attendanceMode: 'full', notes: '' });
    await loadEvents();
  };

  const deleteEvent = async () => {
    if (!token || !confirmDeleteEvent) return;
    await apiFetch(`/admin/events/${confirmDeleteEvent.id}`, { method: 'DELETE' }, token);
    setMsg('Event deleted');
    if (selectedEventId === confirmDeleteEvent.id) {
      setSelectedEventId('');
      setAttendance([]);
    }
    setConfirmDeleteEvent(null);
    await loadEvents();
  };

  const saveEditEvent = async () => {
    if (!token || !editForm) return;
    const validationError = validateEventForm(editForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    await apiFetch(`/admin/events/${editForm.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...editForm,
        name: editForm.name.trim(),
        notes: editForm.notes.trim() || undefined
      })
    }, token);
    setMsg('Event updated');
    setEditForm(null);
    await loadEvents();
  };

  return (
    <section className="content">
      <div className="card">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2>Events</h2>
          <button className="btn primary" onClick={() => { setAddError(''); setShowAddEvent(true); }}>Add Event</button>
        </div>
        {msg && <p className="ok">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card table-wrap">
        <table className="desktop-only">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Time</th>
              <th>Mode</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventsPageRows.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.name}</td>
                <td>{formatDateOnly(ev.event_date)}</td>
                <td>{formatTimeOnly(ev.start_time)} - {formatTimeOnly(ev.end_time)}</td>
                <td>{ev.attendance_mode === 'checkin_only' ? 'Check-in Only' : 'Full'}</td>
                <td>{ev.notes || '-'}</td>
                <td>
                  <div className="row wrap">
                    <button className="btn ghost contact-btn" onClick={() => setSelectedEventId(ev.id)}>Attendance</button>
                    <button className="btn ghost contact-btn edit-btn" onClick={() => setEditForm(toEventForm(ev))}>Edit</button>
                    <button className="btn warn contact-btn" onClick={() => setConfirmDeleteEvent(ev)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mobile-only grid-list">
          {eventsPageRows.map((ev) => (
            <article key={`${ev.id}-mobile`} className="card student">
              <div>
                <h3>{ev.name}</h3>
                <p>{formatDateOnly(ev.event_date)}</p>
                <p>{formatTimeOnly(ev.start_time)} - {formatTimeOnly(ev.end_time)}</p>
                <p>{ev.attendance_mode === 'checkin_only' ? 'Check-in Only' : 'Full'}</p>
                <p>{ev.notes || '-'}</p>
              </div>
              <div className="row wrap">
                <button className="btn ghost contact-btn" onClick={() => setSelectedEventId(ev.id)}>Attendance</button>
                <button className="btn ghost contact-btn edit-btn" onClick={() => setEditForm(toEventForm(ev))}>Edit</button>
                <button className="btn warn contact-btn" onClick={() => setConfirmDeleteEvent(ev)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
        {!!events.length && (
          <div className="row wrap pagination-row" style={{ marginTop: 10 }}>
            <button
              className="btn ghost"
              disabled={eventsPage <= 1}
              onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <p className="eyebrow">Page {eventsPage} of {totalEventsPages}</p>
            <button
              className="btn ghost"
              disabled={eventsPage >= totalEventsPages}
              onClick={() => setEventsPage((p) => Math.min(totalEventsPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Event Attendance</h2>
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
              {attendancePageRows.map((r, i) => (
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
          {!!attendance.length && (
            <div className="row wrap pagination-row" style={{ marginTop: 10 }}>
              <button
                className="btn ghost"
                disabled={attendancePage <= 1}
                onClick={() => setAttendancePage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <p className="eyebrow">Page {attendancePage} of {totalAttendancePages}</p>
              <button
                className="btn ghost"
                disabled={attendancePage >= totalAttendancePages}
                onClick={() => setAttendancePage((p) => Math.min(totalAttendancePages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddEvent && (
        <div className="modal-backdrop" onClick={() => { setAddError(''); setShowAddEvent(false); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Event</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Event Name</span>
                <input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Event Date</span>
                <input type="date" value={form.eventDate} onChange={(e) => setForm((v) => ({ ...v, eventDate: e.target.value }))} />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span className="field-label">Start Time</span>
                  <input type="time" value={form.startTime} onChange={(e) => setForm((v) => ({ ...v, startTime: e.target.value }))} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span className="field-label">End Time</span>
                  <input type="time" value={form.endTime} onChange={(e) => setForm((v) => ({ ...v, endTime: e.target.value }))} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Attendance Mode</span>
                <select value={form.attendanceMode} onChange={(e) => setForm((v) => ({ ...v, attendanceMode: e.target.value as 'full' | 'checkin_only' }))}>
                  <option value="full">Full (Check-in + Check-out)</option>
                  <option value="checkin_only">Check-in Only (Online)</option>
                </select>
              </label>
              <div className="row">
                <button className="btn primary" onClick={() => createEvent().catch(() => setAddError('Failed to create event'))}>Create Event</button>
                <button className="btn ghost" onClick={() => { setAddError(''); setShowAddEvent(false); }}>Cancel</button>
              </div>
              {addError && <p className="error">{addError}</p>}
            </div>
          </div>
        </div>
      )}

      {editForm && (
        <div className="modal-backdrop" onClick={() => setEditForm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Event</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Event Name</span>
                <input value={editForm.name} onChange={(e) => setEditForm((v) => v ? { ...v, name: e.target.value } : v)} />
              </label>
              <label className="field">
                <span className="field-label">Event Date</span>
                <input type="date" value={editForm.eventDate} onChange={(e) => setEditForm((v) => v ? { ...v, eventDate: e.target.value } : v)} />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span className="field-label">Start Time</span>
                  <input type="time" value={editForm.startTime} onChange={(e) => setEditForm((v) => v ? { ...v, startTime: e.target.value } : v)} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span className="field-label">End Time</span>
                  <input type="time" value={editForm.endTime} onChange={(e) => setEditForm((v) => v ? { ...v, endTime: e.target.value } : v)} />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Notes</span>
                <textarea value={editForm.notes} onChange={(e) => setEditForm((v) => v ? { ...v, notes: e.target.value } : v)} />
              </label>
              <label className="field">
                <span className="field-label">Attendance Mode</span>
                <select value={editForm.attendanceMode} onChange={(e) => setEditForm((v) => v ? { ...v, attendanceMode: e.target.value as 'full' | 'checkin_only' } : v)}>
                  <option value="full">Full (Check-in + Check-out)</option>
                  <option value="checkin_only">Check-in Only (Online)</option>
                </select>
              </label>
              <div className="row">
                <button className="btn primary" onClick={() => saveEditEvent().catch(() => setError('Failed to update event'))}>Save Event</button>
                <button className="btn ghost" onClick={() => setEditForm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteEvent && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteEvent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Delete event <strong>{confirmDeleteEvent.name}</strong>?</p>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn warn" onClick={() => deleteEvent().catch(() => setError('Failed to delete event'))}>Confirm</button>
              <button className="btn ghost" onClick={() => setConfirmDeleteEvent(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

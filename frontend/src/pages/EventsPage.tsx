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
  applies_all_groups: boolean;
  group_ids: string[];
  has_report?: boolean;
  notes?: string | null;
};

type Group = {
  id: string;
  name: string;
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

type EventReportRow = {
  id: string;
  event_id: string;
  taught_summary: string;
  other_notes?: string | null;
  submitted_by?: string | null;
  submitted_by_name?: string | null;
  submitted_at: string;
  updated_at: string;
};

type EventFormState = {
  name: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendanceMode: 'full' | 'checkin_only';
  appliesAllGroups: boolean;
  groupIds: string[];
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

const getEventGroupLabel = (event: EventRow, groups: Group[]) => {
  if (event.applies_all_groups) return 'All groups';
  const nameById = new Map(groups.map((g) => [g.id, g.name]));
  const names = (event.group_ids || []).map((id) => nameById.get(id)).filter(Boolean) as string[];
  return names.length ? names.join(', ') : 'Selected groups';
};

const hasEventEnded = (ev: EventRow) => {
  const now = new Date();
  const eventEnd = new Date(`${ev.event_date}T${ev.end_time}`);
  if (Number.isNaN(eventEnd.getTime())) return false;
  return eventEnd.getTime() <= now.getTime();
};

export const EventsPage = () => {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [events, setEvents] = useState<EventRow[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [report, setReport] = useState<EventReportRow | null>(null);
  const [taughtSummary, setTaughtSummary] = useState('');
  const [otherNotes, setOtherNotes] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [reportError, setReportError] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEventReportDialog, setShowEventReportDialog] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState<EventFormState>({
    name: '',
    eventDate: '',
    startTime: '09:00',
    endTime: '11:00',
    attendanceMode: 'full',
    appliesAllGroups: true,
    groupIds: [],
    notes: ''
  });
  const [editForm, setEditForm] = useState<EditEventState | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<EventRow | null>(null);
  const [viewEvent, setViewEvent] = useState<EventRow | null>(null);
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

  const selectedEvent = useMemo(
    () => events.find((ev) => ev.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const canSubmitEventReport = useMemo(() => {
    if (!selectedEvent || !user) return false;
    if (user.role !== 'teacher') return true;
    return hasEventEnded(selectedEvent);
  }, [selectedEvent, user]);

  const toEventForm = (ev: EventRow): EditEventState => ({
    id: ev.id,
    name: ev.name,
    eventDate: formatDateOnly(ev.event_date),
    startTime: formatTimeOnly(ev.start_time),
    endTime: formatTimeOnly(ev.end_time),
    attendanceMode: ev.attendance_mode,
    appliesAllGroups: ev.applies_all_groups,
    groupIds: ev.group_ids || [],
    notes: ev.notes || ''
  });

  const loadGroups = async () => {
    if (!token) return;
    const data = await apiFetch<Group[]>('/groups', {}, token);
    setGroups(data);
  };

  const loadEvents = async () => {
    if (!token) return;
    const data = await apiFetch<EventRow[]>(isAdmin ? '/admin/events' : '/events', {}, token);
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
    if (!token || !eventId || !isAdmin) return;
    const rows = await apiFetch<AttendanceRow[]>(`/admin/events/${eventId}/attendance`, {}, token);
    setAttendance(rows);
  };

  const loadEventReport = async (eventId: string) => {
    if (!token || !eventId) return;
    setReportLoading(true);
    setReportError('');
    try {
      const data = await apiFetch<{ report: EventReportRow | null }>(`/events/${eventId}/report`, {}, token);
      const current = data.report;
      setReport(current);
      setTaughtSummary(current?.taught_summary || '');
      setOtherNotes(current?.other_notes || '');
    } catch {
      setReportError('Failed to load event report');
      setReport(null);
      setTaughtSummary('');
      setOtherNotes('');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadEvents().catch(() => setError('Failed to load events'));
    loadGroups().catch(() => setError('Failed to load groups'));
  }, [token, isAdmin]);

  useEffect(() => {
    if (eventsPage > totalEventsPages) {
      setEventsPage(totalEventsPages);
    }
  }, [eventsPage, totalEventsPages]);

  useEffect(() => {
    if (isAdmin && selectedEventId) loadAttendance(selectedEventId).catch(() => setError('Failed to load event attendance'));
  }, [selectedEventId, isAdmin]);

  useEffect(() => {
    if (!selectedEventId || !token) {
      setReport(null);
      setTaughtSummary('');
      setOtherNotes('');
      return;
    }
    loadEventReport(selectedEventId).catch(() => setReportError('Failed to load event report'));
  }, [selectedEventId, token]);

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
    if (!v.appliesAllGroups && v.groupIds.length === 0) return 'Please select at least one group.';
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
        groupIds: form.appliesAllGroups ? [] : form.groupIds,
        notes: form.notes.trim() || undefined
      })
    }, token);

    setMsg('Event created');
    setShowAddEvent(false);
    setAddError('');
    setForm({ name: '', eventDate: '', startTime: '09:00', endTime: '11:00', attendanceMode: 'full', appliesAllGroups: true, groupIds: [], notes: '' });
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
        groupIds: editForm.appliesAllGroups ? [] : editForm.groupIds,
        notes: editForm.notes.trim() || undefined
      })
    }, token);
    setMsg('Event updated');
    setEditForm(null);
    await loadEvents();
  };

  const toggleGroupSelection = (ids: string[], groupId: string) => {
    if (ids.includes(groupId)) {
      return ids.filter((id) => id !== groupId);
    }
    return [...ids, groupId];
  };

  const openEventReportDialog = (eventId: string) => {
    setSelectedEventId(eventId);
    setReportMsg('');
    setReportError('');
    setShowEventReportDialog(true);
  };

  const closeEventReportDialog = () => {
    setShowEventReportDialog(false);
    setReportMsg('');
    setReportError('');
  };

  const saveEventReport = async () => {
    if (!token || !selectedEventId) return;
    const trimmedSummary = taughtSummary.trim();
    if (trimmedSummary.length < 10) {
      setReportError('What was taught must be at least 10 characters.');
      return;
    }

    setReportSaving(true);
    setReportMsg('');
    setReportError('');
    try {
      const saved = await apiFetch<EventReportRow>(
        `/events/${selectedEventId}/report`,
        {
          method: 'PUT',
          body: JSON.stringify({
            taughtSummary: trimmedSummary,
            otherNotes: otherNotes.trim() || undefined
          })
        },
        token
      );
      setReport(saved);
      setEvents((prev) => prev.map((event) => (event.id === selectedEventId ? { ...event, has_report: true } : event)));
      setTaughtSummary(saved.taught_summary || '');
      setOtherNotes(saved.other_notes || '');
      setReportMsg('Event report saved');
      setShowEventReportDialog(false);
    } catch (e) {
      let message = 'Failed to save event report';
      if (e instanceof Error && e.message) message = e.message;
      setReportError(message);
    } finally {
      setReportSaving(false);
    }
  };

  return (
    <section className="content">
      <div className="card">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2>Events</h2>
          {isAdmin && <button className="btn primary" onClick={() => { setAddError(''); setShowAddEvent(true); }}>Add Event</button>}
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
              <th>Groups</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventsPageRows.map((ev) => (
              <tr key={ev.id} onClick={() => setViewEvent(ev)} style={{ cursor: 'pointer' }}>
                <td>
                  {ev.name}
                  {ev.has_report && (
                    <span className="eyebrow" style={{ marginLeft: 8 }}>Report submitted</span>
                  )}
                </td>
                <td>{formatDateOnly(ev.event_date)}</td>
                <td>{formatTimeOnly(ev.start_time)} - {formatTimeOnly(ev.end_time)}</td>
                <td>{ev.attendance_mode === 'checkin_only' ? 'Check-in Only' : 'Full'}</td>
                <td>{getEventGroupLabel(ev, groups)}</td>
                <td>
                  <div className="row wrap" onClick={(e) => e.stopPropagation()}>
                    <button className="btn ghost contact-btn" onClick={() => openEventReportDialog(ev.id)}>
                      {ev.has_report ? 'Update Report' : 'Report'}
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn ghost contact-btn" onClick={() => setSelectedEventId(ev.id)}>Attendance</button>
                        <button className="btn ghost contact-btn edit-btn" onClick={() => setEditForm(toEventForm(ev))}>Edit</button>
                        <button className="btn warn contact-btn" onClick={() => setConfirmDeleteEvent(ev)}>Delete</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mobile-only grid-list">
          {eventsPageRows.map((ev) => (
            <article key={`${ev.id}-mobile`} className="card student" onClick={() => setViewEvent(ev)} style={{ cursor: 'pointer' }}>
              <div>
                <h3>
                  {ev.name}
                  {ev.has_report && (
                    <span className="eyebrow" style={{ marginLeft: 8 }}>Report submitted</span>
                  )}
                </h3>
                <p>{formatDateOnly(ev.event_date)}</p>
                <p>{formatTimeOnly(ev.start_time)} - {formatTimeOnly(ev.end_time)}</p>
                <p>{ev.attendance_mode === 'checkin_only' ? 'Check-in Only' : 'Full'}</p>
                <p>{getEventGroupLabel(ev, groups)}</p>
              </div>
              {isAdmin && (
                <div className="row wrap" onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost contact-btn" onClick={() => setSelectedEventId(ev.id)}>Attendance</button>
                  <button className="btn ghost contact-btn edit-btn" onClick={() => setEditForm(toEventForm(ev))}>Edit</button>
                  <button className="btn warn contact-btn" onClick={() => setConfirmDeleteEvent(ev)}>Delete</button>
                </div>
              )}
              <div className="row wrap" onClick={(e) => e.stopPropagation()}>
                <button className="btn ghost contact-btn" onClick={() => openEventReportDialog(ev.id)}>
                  {ev.has_report ? 'Update Report' : 'Report'}
                </button>
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

      {isAdmin && (
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
                </tr>
              </thead>
              <tbody>
                {attendancePageRows.map((r, i) => (
                  <tr key={`${r.full_name}-${i}`}>
                    <td>{r.full_name}</td>
                    <td>{r.group_name}</td>
                    <td>{r.checkin_time ? new Date(r.checkin_time).toLocaleString() : '-'}</td>
                    <td>{r.checkout_time ? new Date(r.checkout_time).toLocaleString() : '-'}</td>
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
      )}

      {showEventReportDialog && (
        <div className="modal-backdrop" onClick={closeEventReportDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{report ? 'Update Event Report' : 'Submit Event Report'}</h2>
            {selectedEvent && (
              <p className="eyebrow" style={{ marginTop: -6 }}>
                {selectedEvent.name} ({formatDateOnly(selectedEvent.event_date)})
              </p>
            )}
            {reportLoading ? (
              <p className="eyebrow">Loading event report...</p>
            ) : (
              <div className="form-grid">
                {selectedEvent && user?.role === 'teacher' && !canSubmitEventReport && (
                  <p className="eyebrow field-span-2">Teachers can submit report only after event end time.</p>
                )}
                <label className="field field-span-2">
                  <span className="field-label">What was taught</span>
                  <textarea
                    value={taughtSummary}
                    onChange={(e) => setTaughtSummary(e.target.value)}
                    placeholder="Briefly describe what was taught in this event"
                    rows={4}
                  />
                </label>
                <label className="field field-span-2">
                  <span className="field-label">Other notes</span>
                  <textarea
                    value={otherNotes}
                    onChange={(e) => setOtherNotes(e.target.value)}
                    placeholder="Any extra notes"
                    rows={3}
                  />
                </label>
                {report && (
                  <p className="eyebrow field-span-2">
                    Last submitted by {report.submitted_by_name || 'Unknown'} on {new Date(report.updated_at).toLocaleString()}
                  </p>
                )}
                <div className="row">
                  <button
                    className="btn primary"
                    disabled={reportSaving || !canSubmitEventReport}
                    onClick={() => saveEventReport().catch(() => setReportError('Failed to save event report'))}
                  >
                    {reportSaving ? 'Saving...' : report ? 'Update Report' : 'Submit Report'}
                  </button>
                  <button className="btn ghost" onClick={closeEventReportDialog}>Cancel</button>
                </div>
                {reportMsg && <p className="ok field-span-2">{reportMsg}</p>}
                {reportError && <p className="error field-span-2">{reportError}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && showAddEvent && (
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
              <label className="field">
                <span className="field-label">Group Target</span>
                <select
                  value={form.appliesAllGroups ? 'all' : 'selected'}
                  onChange={(e) => setForm((v) => ({ ...v, appliesAllGroups: e.target.value === 'all' }))}
                >
                  <option value="all">All Groups</option>
                  <option value="selected">Selected Groups</option>
                </select>
              </label>
              {!form.appliesAllGroups && (
                <div className="field">
                  <span className="field-label">Select Groups</span>
                  <div className="event-group-picker">
                    {groups.map((g) => (
                      <label
                        key={g.id}
                        className={form.groupIds.includes(g.id) ? 'event-group-chip checked' : 'event-group-chip'}
                      >
                        <input
                          type="checkbox"
                          checked={form.groupIds.includes(g.id)}
                          onChange={() => setForm((v) => ({ ...v, groupIds: toggleGroupSelection(v.groupIds, g.id) }))}
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="row">
                <button className="btn primary" onClick={() => createEvent().catch(() => setAddError('Failed to create event'))}>Create Event</button>
                <button className="btn ghost" onClick={() => { setAddError(''); setShowAddEvent(false); }}>Cancel</button>
              </div>
              {addError && <p className="error">{addError}</p>}
            </div>
          </div>
        </div>
      )}

      {isAdmin && editForm && (
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
              <label className="field">
                <span className="field-label">Group Target</span>
                <select
                  value={editForm.appliesAllGroups ? 'all' : 'selected'}
                  onChange={(e) => setEditForm((v) => v ? { ...v, appliesAllGroups: e.target.value === 'all' } : v)}
                >
                  <option value="all">All Groups</option>
                  <option value="selected">Selected Groups</option>
                </select>
              </label>
              {!editForm.appliesAllGroups && (
                <div className="field">
                  <span className="field-label">Select Groups</span>
                  <div className="event-group-picker">
                    {groups.map((g) => (
                      <label
                        key={g.id}
                        className={editForm.groupIds.includes(g.id) ? 'event-group-chip checked' : 'event-group-chip'}
                      >
                        <input
                          type="checkbox"
                          checked={editForm.groupIds.includes(g.id)}
                          onChange={() => setEditForm((v) => v ? { ...v, groupIds: toggleGroupSelection(v.groupIds, g.id) } : v)}
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="row">
                <button className="btn primary" onClick={() => saveEditEvent().catch(() => setError('Failed to update event'))}>Save Event</button>
                <button className="btn ghost" onClick={() => setEditForm(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && confirmDeleteEvent && (
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

      {viewEvent && (
        <div className="modal-backdrop" onClick={() => setViewEvent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Event Details</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Event Name</span>
                <input value={viewEvent.name} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Event Date</span>
                <input value={formatDateOnly(viewEvent.event_date)} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Time</span>
                <input value={`${formatTimeOnly(viewEvent.start_time)} - ${formatTimeOnly(viewEvent.end_time)}`} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Attendance Mode</span>
                <input value={viewEvent.attendance_mode === 'checkin_only' ? 'Check-in Only' : 'Full'} readOnly />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Groups</span>
                <input value={getEventGroupLabel(viewEvent, groups)} readOnly />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Notes</span>
                <textarea value={viewEvent.notes || '-'} readOnly />
              </label>
              <div className="row">
                <button className="btn ghost" onClick={() => setViewEvent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

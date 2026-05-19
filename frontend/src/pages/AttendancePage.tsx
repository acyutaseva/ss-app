import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Student } from '../types';

type StudentsApiResponse = {
  items: Student[];
};

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
};

export const AttendancePage = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [msg, setMsg] = useState('');

  const loadEvents = async () => {
    if (!token) return;
    const data = await apiFetch<EventRow[]>('/events?mode=attendance', {}, token);
    setEvents(data);
    if (!selectedEventId && data.length) setSelectedEventId(data[0].id);
  };

  const loadStudents = async () => {
    if (!token) return;
    const data = await apiFetch<StudentsApiResponse>(`/students?search=${encodeURIComponent(query)}&page=1&pageSize=100`, {}, token);
    setStudents(data.items);
  };

  useEffect(() => {
    loadEvents().catch(() => setMsg('Failed to load events'));
    loadStudents().catch(() => setMsg('Failed to load students'));
  }, [token]);

  const checkIn = async (studentId: string) => {
    if (!token || !selectedEventId) return;
    await apiFetch('/attendance/checkin', { method: 'POST', body: JSON.stringify({ studentId, eventId: selectedEventId }) }, token);
    setMsg('Check-in saved');
  };

  const checkOut = async (studentId: string) => {
    if (!token || !selectedEventId) return;
    await apiFetch(
      '/attendance/checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          eventId: selectedEventId,
          pickedByType: 'mother',
          pickedByName: 'Parent',
          notes: 'Quick checkout'
        })
      },
      token
    );
    setMsg('Check-out saved');
  };

  return (
    <section>
      <div className="card">
        <h2>Event Attendance</h2>
        <div className="row wrap">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            <option value="">Select event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.event_date} {ev.start_time.slice(0, 5)}-{ev.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
          <input
            placeholder="Search student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn primary" onClick={() => loadStudents().catch(() => setMsg('Failed to load students'))}>Search</button>
        </div>
        {msg && <p className="ok">{msg}</p>}
      </div>

      <div className="grid-list">
        {students.map((student) => (
          <article className="card student" key={student.id}>
            <div>
              <h3>{student.full_name}</h3>
              <p>{student.group_name}</p>
            </div>
            <div className="row">
              <button className="btn success" disabled={!selectedEventId} onClick={() => checkIn(student.id)}>Check In</button>
              <button className="btn warn" disabled={!selectedEventId} onClick={() => checkOut(student.id)}>Check Out</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Student } from '../types';
import { getStudentAvatarUrl } from '../utils/studentAvatar';

type StudentsApiResponse = {
  items: Student[];
};

type Group = {
  id: string;
  name: string;
};

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  attendance_mode: 'full' | 'checkin_only';
  applies_all_groups: boolean;
  group_ids: string[];
};

const toDialPhone = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/[^\d+]/g, '');
};

const toWhatsAppPhone = (value?: string | null) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('61')) return digits;
  if (digits.startsWith('0')) return `61${digits.slice(1)}`;
  return digits;
};

const shortenName = (value: string, max = 15) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
};

const toDisplayDate = (value: string) => {
  const dateOnly = value.includes('T') ? value.slice(0, 10) : value;
  const [yyyy, mm, dd] = dateOnly.split('-');
  if (!yyyy || !mm || !dd) return value;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = Number(mm) - 1;
  const monthLabel = monthNames[monthIndex];
  if (!monthLabel) return value;
  return `${dd} ${monthLabel} ${yyyy}`;
};

const toEventDateTime = (ev: EventRow) => {
  const iso = `${ev.event_date}T${ev.start_time}`;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const getDefaultEventId = (rows: EventRow[]) => {
  if (!rows.length) return '';
  const today = new Date().toISOString().slice(0, 10);

  const todaysEvents = rows
    .filter((ev) => ev.event_date === today)
    .sort((a, b) => {
      const aTime = toEventDateTime(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = toEventDateTime(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  if (todaysEvents.length) {
    return todaysEvents[0].id;
  }

  const upcomingEvents = rows
    .filter((ev) => ev.event_date > today)
    .sort((a, b) => {
      const aTime = toEventDateTime(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = toEventDateTime(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  return upcomingEvents[0]?.id || rows[0].id;
};

export const AttendancePage = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendanceTab, setAttendanceTab] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [msg, setMsg] = useState('');
  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isCheckinOnlyEvent = selectedEvent?.attendance_mode === 'checkin_only';

  const filteredGroups = useMemo(() => {
    if (!selectedEvent || selectedEvent.applies_all_groups) {
      return groups;
    }
    const allowed = new Set(selectedEvent.group_ids || []);
    return groups.filter((g) => allowed.has(g.id));
  }, [groups, selectedEvent]);

  const toDateOnly = (value?: string | null) => {
    if (!value) return '-';
    return value.includes('T') ? value.slice(0, 10) : value;
  };

  const loadEvents = async () => {
    if (!token) return;
    const data = await apiFetch<EventRow[]>('/events?mode=attendance', {}, token);
    setEvents(data);
    if (!selectedEventId && data.length) setSelectedEventId(getDefaultEventId(data));
  };

  const loadStudents = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set('mode', 'attendance');
    params.set('search', query);
    params.set('page', '1');
    params.set('pageSize', '100');
    if (selectedGroupId) params.set('groupId', selectedGroupId);
    if (selectedEventId) params.set('eventId', selectedEventId);
    const data = await apiFetch<StudentsApiResponse>(`/students?${params.toString()}`, {}, token);
    setStudents(data.items);
  };

  const loadGroups = async () => {
    if (!token) return;
    const data = await apiFetch<Group[]>('/groups', {}, token);
    setGroups(data);
  };

  useEffect(() => {
    loadEvents().catch(() => setMsg('Failed to load events'));
    loadGroups().catch(() => setMsg('Failed to load groups'));
    loadStudents().catch(() => setMsg('Failed to load students'));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadStudents().catch(() => setMsg('Failed to load students'));
  }, [token, selectedEventId, selectedGroupId, query]);

  useEffect(() => {
    if (!selectedEvent) return;

    if (selectedEvent.applies_all_groups) {
      const groupExists = selectedGroupId ? groups.some((g) => g.id === selectedGroupId) : true;
      if (!groupExists) {
        setSelectedGroupId('');
      }
      return;
    }

    if (filteredGroups.length === 1) {
      const onlyGroupId = filteredGroups[0].id;
      if (selectedGroupId !== onlyGroupId) {
        setSelectedGroupId(onlyGroupId);
      }
      return;
    }

    if (selectedGroupId && !filteredGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId('');
    }
  }, [selectedEvent, groups, filteredGroups, selectedGroupId]);

  useEffect(() => {
    if (isCheckinOnlyEvent && attendanceTab === 'checkout') {
      setAttendanceTab('checkin');
    }
  }, [isCheckinOnlyEvent, attendanceTab]);

  const filteredStudents = useMemo(() => {
    if (isCheckinOnlyEvent) {
      return students.filter((student) => !student.checkin_time);
    }
    if (attendanceTab === 'checkin') {
      return students.filter((student) => !student.checkin_time);
    }
    return students.filter((student) => Boolean(student.checkin_time) && !student.checkout_time);
  }, [attendanceTab, students, isCheckinOnlyEvent]);

  const checkIn = async (studentId: string) => {
    if (!token || !selectedEventId) return;
    await apiFetch('/attendance/checkin', { method: 'POST', body: JSON.stringify({ studentId, eventId: selectedEventId }) }, token);
    setMsg('Check-in saved');
    await loadStudents();
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
    await loadStudents();
  };

  return (
    <section className="content">
      <div className="card">
        <h2>Event Attendance</h2>
        <div className="row wrap attendance-filters-row">
          <select className="attendance-filter-control" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            <option value="">Select event</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({toDisplayDate(ev.event_date)} {ev.start_time.slice(0, 5)}-{ev.end_time.slice(0, 5)})
              </option>
            ))}
          </select>
          <select className="attendance-filter-control" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
            {(selectedEvent?.applies_all_groups || filteredGroups.length > 1) && <option value="">All groups</option>}
            {filteredGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <input
            className="attendance-filter-control"
            placeholder="Search student"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {msg && <p className="ok">{msg}</p>}
      </div>

      <div className="dialog-tabs" style={{ marginTop: 10 }}>
        <button className={attendanceTab === 'checkin' ? 'tab-btn active' : 'tab-btn'} onClick={() => setAttendanceTab('checkin')}>
          Checkin Pending ({students.filter((s) => !s.checkin_time).length})
        </button>
        {!isCheckinOnlyEvent && (
          <button className={attendanceTab === 'checkout' ? 'tab-btn active' : 'tab-btn'} onClick={() => setAttendanceTab('checkout')}>
            Checkout Pending ({students.filter((s) => Boolean(s.checkin_time) && !s.checkout_time).length})
          </button>
        )}
        {isCheckinOnlyEvent && (
          <span className="eyebrow" style={{ marginLeft: 'auto', alignSelf: 'center' }}>Check-in only event</span>
        )}
      </div>    
      <div className="grid-list">
        {filteredStudents.map((student) => (
          <article className="card student" key={student.id}>
            <div className="student-interactive" onClick={() => setSelectedStudent(student)}>
              <h3 className="student-name-cell" title={student.full_name}>
                <img className="student-avatar student-avatar-sm" src={getStudentAvatarUrl(student.id, student.gender)} alt="Student avatar" loading="lazy" />
                {shortenName(student.full_name, 15)}
              </h3>
              <p>{student.group_name}</p>
              <p className="student-interactive-hint">View details</p>
            </div>
            <div className="row wrap">
              {toDialPhone(student.mobile_number) && (
                <a className="btn ghost contact-btn" href={`tel:${toDialPhone(student.mobile_number)}`}>Call</a>
              )}
              {toWhatsAppPhone(student.mobile_number) && (
                <a className="btn ghost contact-btn" href={`https://wa.me/${toWhatsAppPhone(student.mobile_number)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              )}
              {attendanceTab === 'checkin' ? (
                <button className="btn success" disabled={!selectedEventId} onClick={() => checkIn(student.id)}>Check In</button>
              ) : (
                <button className="btn warn" disabled={!selectedEventId} onClick={() => checkOut(student.id)}>Check Out</button>
              )}
            </div>
          </article>
        ))}
        {!filteredStudents.length && (
          <article className="card">
            <p className="eyebrow">No students pending {attendanceTab === 'checkin' ? 'check-in' : 'check-out'}.</p>
          </article>
        )}
      </div>

      {selectedStudent && (
        <div className="modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="student-name-cell">
              <img className="student-avatar" src={getStudentAvatarUrl(selectedStudent.id, selectedStudent.gender)} alt="Student avatar" loading="lazy" />
              Student Details
            </h2>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <p><strong>Name:</strong> {selectedStudent.full_name}</p>
              <p><strong>Group:</strong> {selectedStudent.group_name || '-'}</p>
              <p><strong>Date of Birth:</strong> {toDateOnly(selectedStudent.date_of_birth)}</p>
              <p><strong>Father Name:</strong> {selectedStudent.father_name || '-'}</p>
              <p><strong>Mother Name:</strong> {selectedStudent.mother_name || '-'}</p>
              <p><strong>Mobile Number:</strong> {selectedStudent.mobile_number || '-'}</p>
              <p><strong>Email:</strong> {selectedStudent.email || '-'}</p>
              <p><strong>Address:</strong> {selectedStudent.current_address || '-'}</p>
              <p><strong>Hobbies / Interests:</strong> {selectedStudent.hobbies_or_interests || '-'}</p>
              <p><strong>Medical Needs / Allergies:</strong> {selectedStudent.medical_needs_or_allergies || '-'}</p>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn ghost" onClick={() => setSelectedStudent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

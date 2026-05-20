import { useEffect, useMemo, useRef, useState } from 'react';
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

const toShortSchoolYear = (value?: string | null) => {
  if (!value) return '';
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, ' ');
  if (normalized === 'kindy') return 'K';
  if (normalized === 'pre primary') return 'PP';
  const yearMatch = normalized.match(/^year\s*(\d+)$/);
  if (yearMatch) return `Y${yearMatch[1]}`;
  return value;
};

const toShortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length > 1) return `${parts[0]} ${parts[1][0]}.`;
  return fullName;
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
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendanceTab, setAttendanceTab] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [submittingStudentId, setSubmittingStudentId] = useState<string | null>(null);
  const [showCheckinSignatureDialog, setShowCheckinSignatureDialog] = useState(false);
  const [pendingCheckinStudent, setPendingCheckinStudent] = useState<Student | null>(null);
  const [checkinSignerName, setCheckinSignerName] = useState('');
  const [showCheckoutSignatureDialog, setShowCheckoutSignatureDialog] = useState(false);
  const [pendingCheckoutStudent, setPendingCheckoutStudent] = useState<Student | null>(null);
  const [checkoutSignerName, setCheckoutSignerName] = useState('');
  const [msg, setMsg] = useState('');
  const latestStudentsRequestId = useRef(0);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureDrawingRef = useRef(false);
  const signatureHasStrokeRef = useRef(false);
  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isCheckinOnlyEvent = selectedEvent?.attendance_mode === 'checkin_only';

  const filteredGroups = useMemo(() => {
    if (!selectedEvent || selectedEvent.applies_all_groups) {
      return groups;
    }
    const allowed = new Set(selectedEvent.group_ids || []);
    return groups.filter((g) => allowed.has(g.id));
  }, [groups, selectedEvent]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(queryInput.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [queryInput]);

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
    const requestId = ++latestStudentsRequestId.current;
    const params = new URLSearchParams();
    params.set('mode', 'attendance');
    params.set('search', query);
    params.set('page', '1');
    params.set('pageSize', '100');
    if (selectedGroupId) params.set('groupId', selectedGroupId);
    if (selectedEventId) params.set('eventId', selectedEventId);
    const data = await apiFetch<StudentsApiResponse>(`/students?${params.toString()}`, {}, token);
    if (requestId !== latestStudentsRequestId.current) return;
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
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadStudents().catch(() => setMsg('Failed to load students'));
  }, [token, selectedEventId, selectedGroupId, query]);

  useEffect(() => {
    if (!token) return;

    const intervalId = window.setInterval(() => {
      loadStudents().catch(() => setMsg('Failed to refresh students'));
    }, 5000);

    return () => window.clearInterval(intervalId);
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

  const pendingCheckinCount = useMemo(() => students.filter((s) => !s.checkin_time).length, [students]);
  const pendingCheckoutCount = useMemo(() => students.filter((s) => Boolean(s.checkin_time) && !s.checkout_time).length, [students]);

  const checkIn = async (studentId: string, droppedBy?: string, signatureDataUrl?: string) => {
    if (!token || !selectedEventId) return;
    await apiFetch('/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        eventId: selectedEventId,
        droppedBy: droppedBy?.trim() || undefined,
        signatureDataUrl,
        notes: signatureDataUrl ? 'Signature captured on mobile check-in' : undefined
      })
    }, token);
    setMsg('Check-in saved');
    try {
      await loadStudents();
    } catch {
      setMsg('Check-in saved. Student list refresh failed; it will auto-refresh shortly.');
    }
  };

  const checkOut = async (studentId: string, pickedByName?: string, signatureDataUrl?: string) => {
    if (!token || !selectedEventId) return;
    const normalizedPickedByName = pickedByName?.trim();
    await apiFetch(
      '/attendance/checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          eventId: selectedEventId,
          pickedByType: normalizedPickedByName ? 'other' : 'mother',
          pickedByName: normalizedPickedByName || 'Parent',
          signatureDataUrl,
          notes: signatureDataUrl ? 'Signature captured on mobile check-out' : 'Quick checkout'
        })
      },
      token
    );
    setMsg('Check-out saved');
    try {
      await loadStudents();
    } catch {
      setMsg('Check-out saved. Student list refresh failed; it will auto-refresh shortly.');
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    signatureHasStrokeRef.current = false;
  };

  const getSignaturePoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleSignaturePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    const point = getSignaturePoint(e);
    if (!canvas || !point) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    signatureDrawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const handleSignaturePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!signatureDrawingRef.current) return;
    const point = getSignaturePoint(e);
    const canvas = signatureCanvasRef.current;
    if (!canvas || !point) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    signatureHasStrokeRef.current = true;
  };

  const handleSignaturePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    signatureDrawingRef.current = false;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const openCheckinSignatureDialog = (student: Student) => {
    setShowCheckoutSignatureDialog(false);
    setPendingCheckoutStudent(null);
    setCheckoutSignerName('');
    setPendingCheckinStudent(student);
    setCheckinSignerName('');
    setShowCheckinSignatureDialog(true);
    setTimeout(() => {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1f2b20';
      clearSignatureCanvas();
    }, 0);
  };

  const closeCheckinSignatureDialog = () => {
    setShowCheckinSignatureDialog(false);
    setPendingCheckinStudent(null);
    setCheckinSignerName('');
    clearSignatureCanvas();
  };

  const openCheckoutSignatureDialog = (student: Student) => {
    setShowCheckinSignatureDialog(false);
    setPendingCheckinStudent(null);
    setCheckinSignerName('');
    setPendingCheckoutStudent(student);
    setCheckoutSignerName('');
    setShowCheckoutSignatureDialog(true);
    setTimeout(() => {
      const canvas = signatureCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1f2b20';
      clearSignatureCanvas();
    }, 0);
  };

  const closeCheckoutSignatureDialog = () => {
    setShowCheckoutSignatureDialog(false);
    setPendingCheckoutStudent(null);
    setCheckoutSignerName('');
    clearSignatureCanvas();
  };

  const confirmCheckinWithSignature = async () => {
    if (!pendingCheckinStudent || !selectedEventId) return;
    if (!signatureHasStrokeRef.current) {
      setMsg('Please provide a signature before check-in');
      return;
    }

    const signatureCanvas = signatureCanvasRef.current;
    if (!signatureCanvas) {
      setMsg('Signature canvas is unavailable. Please try again.');
      return;
    }

    const signatureDataUrl = signatureCanvas.toDataURL('image/jpeg', 0.72);
    const studentId = pendingCheckinStudent.id;
    const droppedBy = checkinSignerName;

    closeCheckinSignatureDialog();
    setSubmittingStudentId(studentId);
    try {
      await checkIn(studentId, droppedBy, signatureDataUrl);
    } catch (err) {
      // Show backend error message if available
      let errorMsg = 'Attendance update failed';
      if (err && typeof err === 'object') {
        if ('message' in err && typeof err.message === 'string') {
          errorMsg = err.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
      }
      setMsg(errorMsg);
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('Check-in error:', err);
    } finally {
      setSubmittingStudentId(null);
    }
  };

  const confirmCheckoutWithSignature = async () => {
    if (!pendingCheckoutStudent || !selectedEventId) return;
    if (!signatureHasStrokeRef.current) {
      setMsg('Please provide a signature before check-out');
      return;
    }

    const signatureCanvas = signatureCanvasRef.current;
    if (!signatureCanvas) {
      setMsg('Signature canvas is unavailable. Please try again.');
      return;
    }

    const signatureDataUrl = signatureCanvas.toDataURL('image/jpeg', 0.72);
    const studentId = pendingCheckoutStudent.id;
    const pickedByName = checkoutSignerName;

    closeCheckoutSignatureDialog();
    setSubmittingStudentId(studentId);
    try {
      await checkOut(studentId, pickedByName, signatureDataUrl);
    } catch (err) {
      let errorMsg = 'Attendance update failed';
      if (err && typeof err === 'object') {
        if ('message' in err && typeof err.message === 'string') {
          errorMsg = err.message;
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
      }
      setMsg(errorMsg);
      // eslint-disable-next-line no-console
      console.error('Check-out error:', err);
    } finally {
      setSubmittingStudentId(null);
    }
  };

  const handleMobileAttendanceAction = async (student: Student) => {
    if (!selectedEventId || submittingStudentId) return;
    if (attendanceTab === 'checkin') {
      openCheckinSignatureDialog(student);
      return;
    }

    openCheckoutSignatureDialog(student);
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
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
          />
        </div>
        {msg && <p className="ok">{msg}</p>}
      </div>

      <div className="dialog-tabs attendance-tabs" style={{ marginTop: 10 }}>
        <button className={attendanceTab === 'checkin' ? 'tab-btn active' : 'tab-btn'} onClick={() => setAttendanceTab('checkin')}>
          Checkin Pending ({pendingCheckinCount})
        </button>
        {!isCheckinOnlyEvent && (
          <button className={attendanceTab === 'checkout' ? 'tab-btn active' : 'tab-btn'} onClick={() => setAttendanceTab('checkout')}>
            Checkout Pending ({pendingCheckoutCount})
          </button>
        )}
        {isCheckinOnlyEvent && (
          <span className="eyebrow" style={{ marginLeft: 'auto', alignSelf: 'center' }}>Check-in only event</span>
        )}
      </div>    
      <div className="grid-list">
        {filteredStudents.map((student) => (
          <>
            <article className={`card student attendance-card-desktop ${student.is_paid === true ? 'paid-row' : student.is_paid === false ? 'unpaid-row' : ''}`} key={`${student.id}-desktop`}>
              <div className="student-interactive" onClick={() => setSelectedStudent(student)}>
                <h3 className="student-name-cell" title={student.full_name}>
                  <img className="student-avatar student-avatar-sm" src={getStudentAvatarUrl(student.id, student.gender)} alt="Student avatar" loading="lazy" />
                  {toShortName(student.full_name)}
                </h3>
                <p>{student.group_name}{toShortSchoolYear(student.school_year_name) ? ` • ${toShortSchoolYear(student.school_year_name)}` : ''}</p>
                <p className="student-interactive-hint">View details</p>
              </div>
              <div className="row wrap attendance-student-actions">
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

            <article className={`card student attendance-card-mobile ${student.is_paid === true ? 'paid-row' : student.is_paid === false ? 'unpaid-row' : ''}`} key={`${student.id}-mobile`}>
              <div className="attendance-card-header-mobile">
                <img
                  className="student-avatar student-avatar-sm"
                  src={getStudentAvatarUrl(student.id, student.gender)}
                  alt="Student avatar"
                  loading="lazy"
                  onClick={() => setSelectedStudent(student)}
                  style={{ cursor: 'pointer' }}
                />
                <span className="attendance-mobile-name" title={student.full_name}>{toShortName(student.full_name)}</span>
                <span className="attendance-mobile-group">{student.group_name ? student.group_name.split(' ')[0] : ''}</span>
                <span className="attendance-mobile-group">{toShortSchoolYear(student.school_year_name)}</span>
                <span style={{ flex: 1 }} />
                {attendanceTab === 'checkin' ? (
                  <button
                    type="button"
                    className="btn success attendance-mobile-inline-action"
                    disabled={!selectedEventId || submittingStudentId === student.id}
                    onClick={() => void handleMobileAttendanceAction(student)}
                  >
                    {submittingStudentId === student.id ? 'Saving...' : 'Check In'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn warn attendance-mobile-inline-action"
                    disabled={!selectedEventId || submittingStudentId === student.id}
                    onClick={() => void handleMobileAttendanceAction(student)}
                  >
                    {submittingStudentId === student.id ? 'Saving...' : 'Check Out'}
                  </button>
                )}
                {toDialPhone(student.mobile_number) && (
                  <a
                    className="attendance-mobile-contact-icon"
                    href={`tel:${toDialPhone(student.mobile_number)}`}
                    title="Call"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0f766e', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.11.37 2.29.56 3.58.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.85 21 1 12.15 1 2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.29.19 2.47.56 3.58a1 1 0 0 1-.24 1.01l-2.2 2.2Z"/>
                    </svg>
                  </a>
                )}
                {toWhatsAppPhone(student.mobile_number) && (
                  <a
                    className="attendance-mobile-contact-icon"
                    href={`https://wa.me/${toWhatsAppPhone(student.mobile_number)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="WhatsApp"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor" style={{ color: '#25D366', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.472 13.766c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.967-.94 1.166-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.457.13-.605.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.58-.487-.501-.67-.51-.173-.007-.372-.009-.57-.009-.198 0-.52.075-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.086 4.369.712.307 1.267.489 1.701.625.715.228 1.366.196 1.88.119.574-.085 1.758-.719 2.007-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                      <path d="M10 18.333c-4.6 0-8.333-3.733-8.333-8.333 0-4.6 3.733-8.333 8.333-8.333 4.6 0 8.333 3.733 8.333 8.333 0 4.6-3.733 8.333-8.333 8.333zm0-15c-3.683 0-6.667 2.984-6.667 6.667 0 1.18.31 2.29.85 3.25l-1.13 4.13 4.24-1.12c.93.51 1.98.8 3.07.8 3.683 0 6.667-2.984 6.667-6.667 0-3.683-2.984-6.667-6.667-6.667z" fill="currentColor"/>
                    </svg>
                  </a>
                )}
              </div>
            </article>
          </>
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

      {showCheckinSignatureDialog && pendingCheckinStudent && (
        <div className="modal-backdrop" onClick={closeCheckinSignatureDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Sign for Check In</h2>
            <p className="eyebrow" style={{ marginTop: 4 }}>{pendingCheckinStudent.full_name}</p>

            <label className="field" style={{ marginTop: 10 }}>
              <span className="field-label">Dropped by (optional)</span>
              <input
                value={checkinSignerName}
                onChange={(e) => setCheckinSignerName(e.target.value)}
                placeholder="Parent / Guardian name"
              />
            </label>

            <div className="attendance-signature-wrap" style={{ marginTop: 10 }}>
              <canvas
                ref={signatureCanvasRef}
                className="attendance-signature-canvas"
                width={800}
                height={280}
                onPointerDown={handleSignaturePointerDown}
                onPointerMove={handleSignaturePointerMove}
                onPointerUp={handleSignaturePointerUp}
                onPointerLeave={handleSignaturePointerUp}
              />
            </div>

            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={clearSignatureCanvas}>Clear</button>
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={closeCheckinSignatureDialog}>Cancel</button>
              <button
                className="btn success"
                disabled={submittingStudentId === pendingCheckinStudent.id}
                onClick={() => void confirmCheckinWithSignature()}
              >
                {submittingStudentId === pendingCheckinStudent.id ? 'Saving...' : 'Confirm Check In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutSignatureDialog && pendingCheckoutStudent && (
        <div className="modal-backdrop" onClick={closeCheckoutSignatureDialog}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Sign for Check Out</h2>
            <p className="eyebrow" style={{ marginTop: 4 }}>{pendingCheckoutStudent.full_name}</p>

            <label className="field" style={{ marginTop: 10 }}>
              <span className="field-label">Picked up by (optional)</span>
              <input
                value={checkoutSignerName}
                onChange={(e) => setCheckoutSignerName(e.target.value)}
                placeholder="Parent / Guardian name"
              />
            </label>

            <div className="attendance-signature-wrap" style={{ marginTop: 10 }}>
              <canvas
                ref={signatureCanvasRef}
                className="attendance-signature-canvas"
                width={800}
                height={280}
                onPointerDown={handleSignaturePointerDown}
                onPointerMove={handleSignaturePointerMove}
                onPointerUp={handleSignaturePointerUp}
                onPointerLeave={handleSignaturePointerUp}
              />
            </div>

            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={clearSignatureCanvas}>Clear</button>
              <span style={{ flex: 1 }} />
              <button className="btn ghost" onClick={closeCheckoutSignatureDialog}>Cancel</button>
              <button
                className="btn warn"
                disabled={submittingStudentId === pendingCheckoutStudent.id}
                onClick={() => void confirmCheckoutWithSignature()}
              >
                {submittingStudentId === pendingCheckoutStudent.id ? 'Saving...' : 'Confirm Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

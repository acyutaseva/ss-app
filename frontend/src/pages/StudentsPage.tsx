import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
// Utility to show 'First L.' or just 'First' for names
const toShortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length > 1) return `${parts[0]} ${parts[1][0]}.`;
  return fullName;
};
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getStudentAvatarUrl } from '../utils/studentAvatar';

type Group = { id: string; name: string };
type AcademicYear = { id: string; year_label: string; is_active: boolean };
type SchoolYear = { id: string; name: string };
type StudentRow = {
  id: string;
  full_name: string;
  gender?: 'boy' | 'girl' | null;
  date_of_birth?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  current_address?: string | null;
  hobbies_or_interests?: string | null;
  medical_needs_or_allergies?: string | null;
  enrollment_id: string;
  group_id: string;
  school_year_id: string;
  status: 'active' | 'archived' | 'left';
  group_name: string;
  school_year_name: string;
  academic_year: string;
  is_paid: boolean;
  payment_amount?: number | null;
  paid_at?: string | null;
  payment_note?: string | null;
};

type StudentsApiResponse = {
  items: StudentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type EditStudentState = {
  id: string;
  enrollmentId: string;
  fullName: string;
  gender: 'boy' | 'girl' | '';
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  mobileNumber: string;
  email: string;
  currentAddress: string;
  hobbiesOrInterests: string;
  medicalNeedsOrAllergies: string;
  groupId: string;
  schoolYearId: string;
  status: 'active' | 'archived' | 'left';
  isPaid: boolean;
  paymentAmount: number;
  paymentNote: string;
  paidOn: string;
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
};

const groupForSchoolYearName = (schoolYearName: string) => {
  if (schoolYearName === 'Kindy' || schoolYearName === 'Pre Primary') return 'Gopal Group';
  if (['Year 1', 'Year 2', 'Year 3'].includes(schoolYearName)) return 'Madhava Group';
  if (['Year 4', 'Year 5', 'Year 6'].includes(schoolYearName)) return 'Gauranga Group';
  return '';
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

const toEditStudent = (r: StudentRow): EditStudentState => ({
  id: r.id,
  enrollmentId: r.enrollment_id,
  fullName: r.full_name,
  gender: r.gender || '',
  dateOfBirth: toDateInputValue(r.date_of_birth),
  fatherName: r.father_name || '',
  motherName: r.mother_name || '',
  mobileNumber: r.mobile_number || '',
  email: r.email || '',
  currentAddress: r.current_address || '',
  hobbiesOrInterests: r.hobbies_or_interests || '',
  medicalNeedsOrAllergies: r.medical_needs_or_allergies || '',
  groupId: r.group_id,
  schoolYearId: r.school_year_id,
  status: r.status || 'active',
  isPaid: r.is_paid,
  paymentAmount: Number(r.payment_amount ?? 125),
  paymentNote: r.payment_note || '',
  paidOn: toDateInputValue(r.paid_at)
});

export const StudentsPage = () => {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mobilePage, setMobilePage] = useState(1);
  const [mobileHasMore, setMobileHasMore] = useState(true);
  const mobileListRef = useRef<HTMLDivElement | null>(null);
  const mobileLoadingRef = useRef<HTMLDivElement | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [error, setError] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({
    fullName: '',
    gender: '',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    mobileNumber: '',
    email: '',
    currentAddress: '',
    hobbiesOrInterests: '',
    medicalNeedsOrAllergies: '',
    groupId: '',
    schoolYearId: ''
  });
  const [addStudentError, setAddStudentError] = useState('');
  const [editStudent, setEditStudent] = useState<EditStudentState | null>(null);
  const [editTab, setEditTab] = useState<'profile' | 'enrollment' | 'payment'>('profile');
  const [confirmAction, setConfirmAction] = useState<null | 'save' | 'archive' | 'delete'>(null);
  const [togglingEnrollmentId, setTogglingEnrollmentId] = useState<string | null>(null);
  const [viewStudent, setViewStudent] = useState<StudentRow | null>(null);
  const latestRowsRequestId = useRef(0);

  const resolveGroupIdFromSchoolYearId = (schoolYearId: string) => {
    const selectedSchoolYear = schoolYears.find((y) => y.id === schoolYearId);
    if (!selectedSchoolYear) return '';
    const logicalGroup = groupForSchoolYearName(selectedSchoolYear.name);
    if (!logicalGroup) return '';
    const match = groups.find((g) => g.name.includes(logicalGroup));
    return match?.id || '';
  };

  const resolveGroupNameFromSchoolYearId = (schoolYearId: string) => {
    const selectedSchoolYear = schoolYears.find((y) => y.id === schoolYearId);
    if (!selectedSchoolYear) return '-';
    const logicalGroup = groupForSchoolYearName(selectedSchoolYear.name);
    const match = groups.find((g) => g.name.includes(logicalGroup));
    return match?.name || '-';
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadLookups = async () => {
    if (!token) return;
    const [groupData, schoolYearData] = await Promise.all([
      apiFetch<Group[]>('/groups', {}, token),
      apiFetch<SchoolYear[]>('/school-years', {}, token)
    ]);

    let yearData: AcademicYear[] = [];
    if (isAdmin) {
      yearData = await apiFetch<AcademicYear[]>('/admin/academic-years', {}, token);
    }

    setGroups(groupData.map((g) => ({ id: g.id, name: g.name })));
    setYears(yearData);
    setSchoolYears(schoolYearData);
    if (isAdmin) {
      const active = yearData.find((y) => y.is_active);
      if (active) setAcademicYear(active.year_label);
    } else {
      setAcademicYear('');
    }
  };

  const loadRows = async () => {
    if (!token) return;
    const requestId = ++latestRowsRequestId.current;
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (groupId) params.set('groupId', groupId);
    if (academicYear) params.set('academicYear', academicYear);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    const data = await apiFetch<StudentsApiResponse>(`/students?${params.toString()}`, {}, token);
    if (requestId !== latestRowsRequestId.current) return;
    setRows(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  };

  // Infinite scroll for mobile
  const loadMoreMobileRows = useCallback(async () => {
    if (!token || !mobileHasMore) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (groupId) params.set('groupId', groupId);
    if (academicYear) params.set('academicYear', academicYear);
    params.set('page', String(mobilePage));
    params.set('pageSize', String(pageSize));
    const data = await apiFetch<StudentsApiResponse>(`/students?${params.toString()}`, {}, token);
    setRows((prev) => mobilePage === 1 ? data.items : [...prev, ...data.items]);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setMobileHasMore(mobilePage < data.totalPages);
  }, [token, search, groupId, academicYear, mobilePage, pageSize, mobileHasMore]);

  useEffect(() => {
    loadLookups().catch(() => setError('Failed to load filters'));
  }, [token]);

  // Desktop/tablet paginated
  useEffect(() => {
    if (!token) return;
    loadRows().catch(() => setError('Failed to load students'));
  }, [token, academicYear, groupId, page, pageSize, search]);


  // Mobile infinite scroll: reset page, hasMore, and rows when filters/search/token change
  useEffect(() => {
    setRows([]);
    setMobilePage(1);
    setMobileHasMore(true);
  }, [search, groupId, academicYear, token]);

  useEffect(() => {
    loadMoreMobileRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobilePage, search, groupId, academicYear, token]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = mobileLoadingRef.current;
    if (!el) return;
    const observer = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && mobileHasMore) {
        setMobilePage((p) => p + 1);
      }
    }, { root: null, rootMargin: '0px', threshold: 1.0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mobileHasMore]);

  const stats = useMemo(() => {
    const totalRows = rows.length;
    const paid = rows.filter((r) => r.is_paid).length;
    return { totalRows, paid, unpaid: totalRows - paid };
  }, [rows]);

  const archiveStudent = async (enrollmentId: string) => {
    if (!token) return;
    await apiFetch(`/admin/students/enrollments/${enrollmentId}/archive`, { method: 'PATCH' }, token);
    await loadRows();
  };

  const deleteStudent = async (studentId: string) => {
    if (!token) return;
    await apiFetch(`/admin/students/${studentId}`, { method: 'DELETE' }, token);
    setRows((prev) => prev.filter((r) => r.id !== studentId));
    setTotal((prev) => Math.max(0, prev - 1));
    if (rows.length === 1 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
      return;
    }
    await loadRows();
  };

  const saveStudent = async () => {
    if (!token || !editStudent) return;
    await apiFetch(`/admin/students/${editStudent.id}`, {
      method: 'PATCH',
      body: JSON.stringify(editStudent)
    }, token);
    await apiFetch(`/admin/enrollments/${editStudent.enrollmentId}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({
        isPaid: editStudent.isPaid,
        paymentAmount: editStudent.paymentAmount,
        paymentNote: editStudent.paymentNote || undefined,
        paidOn: editStudent.isPaid ? (editStudent.paidOn || undefined) : undefined
      })
    }, token);
    setEditStudent(null);
    await loadRows();
  };

  const togglePaymentFromTable = async (row: StudentRow) => {
    if (!token || !isAdmin || togglingEnrollmentId) return;
    const nextIsPaid = !row.is_paid;
    const normalizedAmount = Number(row.payment_amount ?? 125);
    const paymentAmount = Number.isFinite(normalizedAmount) ? normalizedAmount : 125;
    setTogglingEnrollmentId(row.enrollment_id);

    // Optimistic UI update keeps the list responsive while the API call is in flight.
    setRows((prev) => prev.map((item) => (
      item.enrollment_id === row.enrollment_id
        ? { ...item, is_paid: nextIsPaid }
        : item
    )));

    try {
      await apiFetch(`/admin/enrollments/${row.enrollment_id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          isPaid: nextIsPaid,
          paymentAmount,
          paymentNote: row.payment_note || undefined,
          paidOn: nextIsPaid ? (row.paid_at ? toDateInputValue(row.paid_at) : undefined) : undefined
        })
      }, token);
      await loadRows();
    } catch (_err) {
      // Roll back optimistic state if the request fails.
      setRows((prev) => prev.map((item) => (
        item.enrollment_id === row.enrollment_id
          ? { ...item, is_paid: row.is_paid }
          : item
      )));
      setError('Failed to update payment status');
    } finally {
      setTogglingEnrollmentId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!editStudent) return;
    if (confirmAction === 'save') {
      await saveStudent();
      return;
    }
    if (confirmAction === 'archive') {
      await archiveStudent(editStudent.enrollmentId);
      setEditStudent(null);
      return;
    }
    if (confirmAction === 'delete') {
      const studentId = editStudent.id;
      setConfirmAction(null);
      setEditStudent(null);
      await deleteStudent(studentId);
      return;
    }
  };

  const createStudent = async () => {
    if (!token) return;
    const fullName = addStudentForm.fullName.trim();
    if (fullName.length < 2) {
      setAddStudentError('Student name must be at least 2 characters.');
      return;
    }
    if (!addStudentForm.groupId) {
      setAddStudentError('Please select a group.');
      return;
    }
    if (!addStudentForm.schoolYearId) {
      setAddStudentError('Please select a school year.');
      return;
    }
    const computedGroupId = resolveGroupIdFromSchoolYearId(addStudentForm.schoolYearId);
    if (!computedGroupId) {
      setAddStudentError('Unable to map selected school year to a group.');
      return;
    }
    if (addStudentForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addStudentForm.email)) {
      setAddStudentError('Please enter a valid email address.');
      return;
    }

    setAddStudentError('');
    await apiFetch('/admin/students', {
      method: 'POST',
      body: JSON.stringify({
        ...addStudentForm,
        fullName,
        gender: addStudentForm.gender || undefined,
        groupId: computedGroupId
      })
    }, token);
    setShowAddStudent(false);
    setAddStudentForm({
      fullName: '',
      gender: '',
      dateOfBirth: '',
      fatherName: '',
      motherName: '',
      mobileNumber: '',
      email: '',
      currentAddress: '',
      hobbiesOrInterests: '',
      medicalNeedsOrAllergies: '',
      groupId: '',
      schoolYearId: ''
    });
    setAddStudentError('');
    await loadRows();
  };

  return (
    <section className="content">
      <div className="card">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2>Students</h2>
          {isAdmin && <button className="btn primary" onClick={() => { setAddStudentError(''); setShowAddStudent(true); }}>Add Student</button>}
        </div>

        {/* Filter Bar */}
        <div className="row wrap filter-bar" style={{ gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
          <input
            className="input"
            type="text"
            placeholder="Search by name, parent, or mobile"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ minWidth: 180, flex: 1 }}
          />
          <select
            className="input"
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {isAdmin && (
            <select
              className="input"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="">All Academic Years</option>
              {years.map(y => (
                <option key={y.year_label} value={y.year_label}>{y.year_label}{y.is_active ? ' (Active)' : ''}</option>
              ))}
            </select>
          )}
        </div>

        <div className="row wrap">
          {/* Desktop Table */}
          <table className="desktop-only">
            <thead>
              <tr>
                <th>Student</th>
                <th>Gender</th>
                <th>Group</th>
                <th>School Year</th>
                <th>Contact</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.enrollment_id}
                  className={r.is_paid ? 'student-row paid-row' : 'student-row unpaid-row'}
                  onClick={() => setViewStudent(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="student-name-cell">
                      <img className="student-avatar" src={getStudentAvatarUrl(r.id, r.gender)} alt="Student avatar" loading="lazy" />
                      <span>{r.full_name}</span>
                    </div>
                  </td>
                  <td>{r.gender ? (r.gender === 'boy' ? 'Boy' : 'Girl') : '-'}</td>
                  <td>{r.group_name}</td>
                  <td>{r.school_year_name}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row wrap">
                      {toDialPhone(r.mobile_number) && (
                        <a className="btn ghost contact-btn" href={`tel:${toDialPhone(r.mobile_number)}`} title="Call" style={{ padding: 4, display: 'inline-flex', alignItems: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0f766e', display: 'block', marginRight: 4 }} xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.11.37 2.29.56 3.58.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.85 21 1 12.15 1 2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.29.19 2.47.56 3.58a1 1 0 0 1-.24 1.01l-2.2 2.2Z"/>
                          </svg>
                          <span className="desktop-contact-text">Call</span>
                        </a>
                      )}
                      {toWhatsAppPhone(r.mobile_number) && (
                        <a className="btn ghost contact-btn" href={`https://wa.me/${toWhatsAppPhone(r.mobile_number)}`} target="_blank" rel="noreferrer" title="WhatsApp" style={{ padding: 4, display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}>
                          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" style={{ color: '#25D366', display: 'block', marginRight: 4 }} xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.472 13.766c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.967-.94 1.166-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.457.13-.605.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.58-.487-.501-.67-.51-.173-.007-.372-.009-.57-.009-.198 0-.52.075-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.086 4.369.712.307 1.267.489 1.701.625.715.228 1.366.196 1.88.119.574-.085 1.758-.719 2.007-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                            <path d="M10 18.333c-4.6 0-8.333-3.733-8.333-8.333 0-4.6 3.733-8.333 8.333-8.333 4.6 0 8.333 3.733 8.333 8.333 0 4.6-3.733 8.333-8.333 8.333zm0-15c-3.683 0-6.667 2.984-6.667 6.667 0 1.18.31 2.29.85 3.25l-1.13 4.13 4.24-1.12c.93.51 1.98.8 3.07.8 3.683 0 6.667-2.984 6.667-6.667 0-3.683-2.984-6.667-6.667-6.667z" fill="currentColor"/>
                          </svg>
                          <span className="desktop-contact-text">WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row wrap">
                        <button className="btn ghost contact-btn edit-btn" onClick={() => { setEditStudent(toEditStudent(r)); setEditTab('profile'); }}>Edit</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card List */}
          <div className="mobile-only grid-list students-mobile-list" ref={mobileListRef}>
            {rows.map((r) => {
              const groupFirstWord = r.group_name ? r.group_name.split(' ')[0] : '';
              return (
                <article
                  className={`card student ${r.is_paid ? 'paid-row' : 'unpaid-row'}`}
                  key={`${r.enrollment_id}-mobile`}
                  onClick={() => setViewStudent(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="student-card-header-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
                      <img className="student-avatar student-avatar-sm" src={getStudentAvatarUrl(r.id, r.gender)} alt="Student avatar" loading="lazy" />
                      <span style={{ fontWeight: 700 }}>{toShortName(r.full_name)}</span>
                      <span style={{ color: '#5f665f', fontSize: 13, marginLeft: 6 }}>{groupFirstWord}</span>
                      <span style={{ color: '#5f665f', fontSize: 13 }}>{toShortSchoolYear(r.school_year_name)}</span>
                      <span style={{ flex: 1 }} />
                      {toDialPhone(r.mobile_number) && (
                        <a className="mobile-contact-icon" href={`tel:${toDialPhone(r.mobile_number)}`} title="Call" style={{ marginLeft: 2, display: 'inline-flex', alignItems: 'center', height: 20, width: 20, background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#0f766e', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.11.37 2.29.56 3.58.56a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.85 21 1 12.15 1 2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.29.19 2.47.56 3.58a1 1 0 0 1-.24 1.01l-2.2 2.2Z"/>
                          </svg>
                        </a>
                      )}
                      {toWhatsAppPhone(r.mobile_number) && (
                        <a className="mobile-contact-icon" href={`https://wa.me/${toWhatsAppPhone(r.mobile_number)}`} target="_blank" rel="noreferrer" title="WhatsApp" style={{ marginLeft: 2, display: 'inline-flex', alignItems: 'center', height: 20, width: 20, background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor" style={{ color: '#25D366', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.472 13.766c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.198.297-.767.967-.94 1.166-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.457.13-.605.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.58-.487-.501-.67-.51-.173-.007-.372-.009-.57-.009-.198 0-.52.075-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.205 5.086 4.369.712.307 1.267.489 1.701.625.715.228 1.366.196 1.88.119.574-.085 1.758-.719 2.007-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor"/>
                            <path d="M10 18.333c-4.6 0-8.333-3.733-8.333-8.333 0-4.6 3.733-8.333 8.333-8.333 4.6 0 8.333 3.733 8.333 8.333 0 4.6-3.733 8.333-8.333 8.333zm0-15c-3.683 0-6.667 2.984-6.667 6.667 0 1.18.31 2.29.85 3.25l-1.13 4.13 4.24-1.12c.93.51 1.98.8 3.07.8 3.683 0 6.667-2.984 6.667-6.667 0-3.683-2.984-6.667-6.667-6.667z" fill="currentColor"/>
                          </svg>
                        </a>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop: 2 }}>
                        <button className="btn ghost contact-btn edit-btn" onClick={() => { setEditStudent(toEditStudent(r)); setEditTab('profile'); }}>Edit</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            <div ref={mobileLoadingRef} style={{ height: 32, display: mobileHasMore ? 'block' : 'none', textAlign: 'center', color: '#888', fontSize: 14 }}>
              {mobileHasMore ? 'Loading more...' : ''}
            </div>
          </div>
        </div>
      </div>

      {viewStudent && (
        <div className="modal-backdrop" onClick={() => setViewStudent(null)}>
          <div className="modal-card student-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="student-name-cell">
              <img className="student-avatar" src={getStudentAvatarUrl(viewStudent.id, viewStudent.gender)} alt="Student avatar" loading="lazy" />
              Student Details
            </h2>
            <div className="form-grid student-edit-grid">
              <label className="field">
                <span className="field-label">Student Name</span>
                <input value={viewStudent.full_name} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Gender</span>
                <input value={viewStudent.gender ? (viewStudent.gender === 'boy' ? 'Boy' : 'Girl') : '-'} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Date of Birth</span>
                <input value={toDateInputValue(viewStudent.date_of_birth) || '-'} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Group</span>
                <input value={viewStudent.group_name} readOnly />
              </label>
              <label className="field">
                <span className="field-label">School Year</span>
                <input value={viewStudent.school_year_name} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Father Name</span>
                <input value={viewStudent.father_name || '-'} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Mother Name</span>
                <input value={viewStudent.mother_name || '-'} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Mobile Number</span>
                <input value={viewStudent.mobile_number || '-'} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input value={viewStudent.email || '-'} readOnly />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Current Address</span>
                <textarea value={viewStudent.current_address || '-'} readOnly />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Hobbies / Interests</span>
                <textarea value={viewStudent.hobbies_or_interests || '-'} readOnly />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Medical Needs / Allergies</span>
                <textarea value={viewStudent.medical_needs_or_allergies || '-'} readOnly />
              </label>
              <div className="row student-edit-actions">
                <button className="btn ghost" onClick={() => setViewStudent(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card desktop-only">
        <div className="row pagination-row">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <p>Page {page} of {totalPages}</p>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      {isAdmin && editStudent && (
        <div className="modal-backdrop" onClick={() => setEditStudent(null)}>
          <div className="modal-card student-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Student</h2>
            <div className="dialog-tabs">
              <button className={editTab === 'profile' ? 'tab-btn active' : 'tab-btn'} onClick={() => setEditTab('profile')}>Profile</button>
              <button className={editTab === 'enrollment' ? 'tab-btn active' : 'tab-btn'} onClick={() => setEditTab('enrollment')}>Enrollment</button>
              <button className={editTab === 'payment' ? 'tab-btn active' : 'tab-btn'} onClick={() => setEditTab('payment')}>Payment</button>
            </div>
            <div className="form-grid student-edit-grid">
              {editTab === 'profile' && (
                <>
                  <label className="field">
                    <span className="field-label">Student Name</span>
                    <input value={editStudent.fullName} onChange={(e) => setEditStudent((v) => v ? { ...v, fullName: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Date of Birth</span>
                    <input type="date" value={editStudent.dateOfBirth} onChange={(e) => setEditStudent((v) => v ? { ...v, dateOfBirth: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Gender</span>
                    <select value={editStudent.gender} onChange={(e) => setEditStudent((v) => v ? { ...v, gender: e.target.value as 'boy' | 'girl' | '' } : v)}>
                      <option value="">Select gender</option>
                      <option value="boy">Boy</option>
                      <option value="girl">Girl</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Father Name</span>
                    <input value={editStudent.fatherName} onChange={(e) => setEditStudent((v) => v ? { ...v, fatherName: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Mother Name</span>
                    <input value={editStudent.motherName} onChange={(e) => setEditStudent((v) => v ? { ...v, motherName: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Mobile Number</span>
                    <input value={editStudent.mobileNumber} onChange={(e) => setEditStudent((v) => v ? { ...v, mobileNumber: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Email</span>
                    <input value={editStudent.email} onChange={(e) => setEditStudent((v) => v ? { ...v, email: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Current Address</span>
                    <textarea value={editStudent.currentAddress} onChange={(e) => setEditStudent((v) => v ? { ...v, currentAddress: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Hobbies / Interests</span>
                    <textarea value={editStudent.hobbiesOrInterests} onChange={(e) => setEditStudent((v) => v ? { ...v, hobbiesOrInterests: e.target.value } : v)} />
                  </label>
                  <label className="field">
                    <span className="field-label">Medical Needs / Allergies</span>
                    <textarea value={editStudent.medicalNeedsOrAllergies} onChange={(e) => setEditStudent((v) => v ? { ...v, medicalNeedsOrAllergies: e.target.value } : v)} />
                  </label>
                </>
              )}
              {editTab === 'enrollment' && (
                <>
                  <label className="field">
                    <span className="field-label">Group (Auto)</span>
                    <input value={resolveGroupNameFromSchoolYearId(editStudent.schoolYearId)} readOnly />
                  </label>
                  <label className="field">
                    <span className="field-label">School Year</span>
                    <select
                      value={editStudent.schoolYearId}
                      onChange={(e) => setEditStudent((v) => {
                        if (!v) return v;
                        const schoolYearId = e.target.value;
                        const groupId = resolveGroupIdFromSchoolYearId(schoolYearId);
                        return { ...v, schoolYearId, groupId };
                      })}
                    >
                      {schoolYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Status</span>
                    <select value={editStudent.status} onChange={(e) => setEditStudent((v) => v ? { ...v, status: e.target.value as 'active' | 'archived' | 'left' } : v)}>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                      <option value="left">Left</option>
                    </select>
                  </label>
                </>
              )}
              {editTab === 'payment' && (
                <>
                  <label className="field">
                    <span className="field-label">Payment</span>
                    <div className="row wrap">
                      <label className="row">
                        <input
                          type="checkbox"
                          checked={editStudent.isPaid}
                          onChange={() => setEditStudent((v) => v ? { ...v, isPaid: true } : v)}
                        />
                        <span>Paid</span>
                      </label>
                      <label className="row">
                        <input
                          type="checkbox"
                          checked={!editStudent.isPaid}
                          onChange={() => setEditStudent((v) => v ? { ...v, isPaid: false } : v)}
                        />
                        <span>Unpaid</span>
                      </label>
                    </div>
                  </label>
                  <label className="field">
                    <span className="field-label">Paid On</span>
                    <input
                      type="date"
                      value={editStudent.paidOn}
                      onChange={(e) => setEditStudent((v) => v ? { ...v, paidOn: e.target.value } : v)}
                      disabled={!editStudent.isPaid}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Amount (AUD)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editStudent.paymentAmount}
                      onChange={(e) => setEditStudent((v) => v ? { ...v, paymentAmount: Number(e.target.value || 0) } : v)}
                    />
                  </label>
                  <label className="field field-span-2">
                    <span className="field-label">Payment Note</span>
                    <textarea value={editStudent.paymentNote} onChange={(e) => setEditStudent((v) => v ? { ...v, paymentNote: e.target.value } : v)} />
                  </label>
                </>
              )}
              <div className="row student-edit-actions">
                <button className="btn primary" onClick={() => setConfirmAction('save')}>Save Student</button>
                <button
                  className="btn warn"
                  onClick={() => setConfirmAction('archive')}
                >
                  Archive
                </button>
                <button
                  className="btn warn"
                  onClick={() => setConfirmAction('delete')}
                >
                  Delete
                </button>
                <button className="btn ghost" onClick={() => setEditStudent(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && editStudent && confirmAction && (
        <div className="modal-backdrop" onClick={() => setConfirmAction(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Action</h2>
            {confirmAction === 'save' && <p>Save changes for <strong>{editStudent.fullName}</strong>?</p>}
            {confirmAction === 'archive' && <p>Archive <strong>{editStudent.fullName}</strong>?</p>}
            {confirmAction === 'delete' && <p>Delete <strong>{editStudent.fullName}</strong>? This cannot be undone.</p>}
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className={confirmAction === 'delete' ? 'btn warn' : 'btn primary'}
                onClick={() => runConfirmedAction().then(() => setConfirmAction(null)).catch(() => setError('Action failed'))}
              >
                Confirm
              </button>
              <button className="btn ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showAddStudent && (
        <div className="modal-backdrop" onClick={() => { setAddStudentError(''); setShowAddStudent(false); }}>
          <div className="modal-card student-modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Student</h2>
            <div className="form-grid student-edit-grid">
              <label className="field">
                <span className="field-label">Student Name</span>
                <input value={addStudentForm.fullName} onChange={(e) => setAddStudentForm((v) => ({ ...v, fullName: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Date of Birth</span>
                <input type="date" value={addStudentForm.dateOfBirth} onChange={(e) => setAddStudentForm((v) => ({ ...v, dateOfBirth: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Gender</span>
                <select value={addStudentForm.gender} onChange={(e) => setAddStudentForm((v) => ({ ...v, gender: e.target.value }))}>
                  <option value="">Select gender</option>
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Father Name</span>
                <input value={addStudentForm.fatherName} onChange={(e) => setAddStudentForm((v) => ({ ...v, fatherName: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Mother Name</span>
                <input value={addStudentForm.motherName} onChange={(e) => setAddStudentForm((v) => ({ ...v, motherName: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Mobile Number</span>
                <input value={addStudentForm.mobileNumber} onChange={(e) => setAddStudentForm((v) => ({ ...v, mobileNumber: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input type="email" value={addStudentForm.email} onChange={(e) => setAddStudentForm((v) => ({ ...v, email: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Group (Auto)</span>
                <input value={resolveGroupNameFromSchoolYearId(addStudentForm.schoolYearId)} readOnly />
              </label>
              <label className="field">
                <span className="field-label">School Year</span>
                <select value={addStudentForm.schoolYearId} onChange={(e) => setAddStudentForm((v) => ({ ...v, schoolYearId: e.target.value, groupId: resolveGroupIdFromSchoolYearId(e.target.value) }))}>
                  <option value="">Select school year</option>
                  {schoolYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </label>
              <label className="field field-span-2">
                <span className="field-label">Current Address</span>
                <textarea value={addStudentForm.currentAddress} onChange={(e) => setAddStudentForm((v) => ({ ...v, currentAddress: e.target.value }))} />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Hobbies / Interests</span>
                <textarea value={addStudentForm.hobbiesOrInterests} onChange={(e) => setAddStudentForm((v) => ({ ...v, hobbiesOrInterests: e.target.value }))} />
              </label>
              <label className="field field-span-2">
                <span className="field-label">Medical Needs / Allergies</span>
                <textarea value={addStudentForm.medicalNeedsOrAllergies} onChange={(e) => setAddStudentForm((v) => ({ ...v, medicalNeedsOrAllergies: e.target.value }))} />
              </label>
              <div className="row student-edit-actions">
                <button className="btn primary" onClick={() => createStudent().catch(() => setError('Failed to create student'))}>Create Student</button>
                <button className="btn ghost" onClick={() => { setAddStudentError(''); setShowAddStudent(false); }}>Cancel</button>
              </div>
              {addStudentError && <p className="error field-span-2">{addStudentError}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

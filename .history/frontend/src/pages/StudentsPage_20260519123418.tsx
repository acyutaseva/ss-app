import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Group = { id: string; name: string };
type AcademicYear = { id: string; year_label: string; is_active: boolean };
type SchoolYear = { id: string; name: string };
type StudentRow = {
  id: string;
  full_name: string;
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
  academic_year: string;
  is_paid: boolean;
  paid_at?: string | null;
};

type StudentsApiResponse = {
  items: StudentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const StudentsPage = () => {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 1;
  const [error, setError] = useState('');
  const [editStudent, setEditStudent] = useState<null | {
    id: string;
    enrollmentId: string;
    fullName: string;
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
  }>(null);

  const loadLookups = async () => {
    if (!token) return;
    const [groupData, yearData, schoolYearData] = await Promise.all([
      apiFetch<Group[]>('/groups', {}, token),
      apiFetch<AcademicYear[]>('/admin/academic-years', {}, token),
      apiFetch<SchoolYear[]>('/school-years', {}, token)
    ]);
    setGroups(groupData.map((g) => ({ id: g.id, name: g.name })));
    setYears(yearData);
    setSchoolYears(schoolYearData);
    const active = yearData.find((y) => y.is_active);
    if (active) setAcademicYear(active.year_label);
  };

  const loadRows = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (groupId) params.set('groupId', groupId);
    if (academicYear) params.set('academicYear', academicYear);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    const data = await apiFetch<StudentsApiResponse>(`/students?${params.toString()}`, {}, token);
    setRows(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  };

  useEffect(() => {
    loadLookups().catch(() => setError('Failed to load filters'));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadRows().catch(() => setError('Failed to load students'));
  }, [token, academicYear, groupId, page, pageSize, search]);

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
    await loadRows();
  };

  const saveStudent = async () => {
    if (!token || !editStudent) return;
    await apiFetch(`/admin/students/${editStudent.id}`, {
      method: 'PATCH',
      body: JSON.stringify(editStudent)
    }, token);
    setEditStudent(null);
    await loadRows();
  };

  return (
    <section className="content">
      <div className="card">
        <h2>All Students</h2>
        <div className="row wrap">
          <div className="desktop-filter-pair">
            <input
              placeholder="Search student"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              className="filter-group"
              value={groupId}
              onChange={(e) => {
                setPage(1);
                setGroupId(e.target.value);
              }}
            >
              <option value="">All groups</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select
              value={academicYear}
              onChange={(e) => {
                setPage(1);
                setAcademicYear(e.target.value);
              }}
            >
              <option value="">Active year</option>
              {years.map((y) => <option key={y.id} value={y.year_label}>{y.year_label}{y.is_active ? ' (Active)' : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="row wrap">
          <p className="eyebrow">All matching: {total} • Current page paid: {stats.paid} • unpaid: {stats.unpaid}</p>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card table-wrap">
        <table className="desktop-only">
          <thead>
            <tr>
              <th>Student</th>
              <th>Group</th>
              <th>Academic Year</th>
              <th>Payment</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.id}-${r.academic_year}`}>
                <td>{r.full_name}</td>
                <td>{r.group_name}</td>
                <td>{r.academic_year}</td>
                <td>{r.is_paid ? 'Paid' : 'Unpaid'}</td>
                {isAdmin && (
                  <td>
                    <div className="row wrap">
                      <button className="btn ghost" onClick={() => setEditStudent({
                        id: r.id,
                        enrollmentId: r.enrollment_id,
                        fullName: r.full_name,
                        dateOfBirth: r.date_of_birth || '',
                        fatherName: r.father_name || '',
                        motherName: r.mother_name || '',
                        mobileNumber: r.mobile_number || '',
                        email: r.email || '',
                        currentAddress: r.current_address || '',
                        hobbiesOrInterests: r.hobbies_or_interests || '',
                        medicalNeedsOrAllergies: r.medical_needs_or_allergies || '',
                        groupId: r.group_id,
                        schoolYearId: r.school_year_id,
                        status: r.status || 'active'
                      })}>Edit</button>
                      <button className="btn warn" onClick={() => archiveStudent(r.enrollment_id).catch(() => setError('Failed to archive student'))}>Archive</button>
                      <button className="btn warn" onClick={() => deleteStudent(r.id).catch(() => setError('Failed to delete student'))}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mobile-only grid-list">
          {rows.map((r) => (
            <article className="card student" key={`${r.id}-${r.academic_year}-mobile`}>
              <div>
                <h3>{r.full_name}</h3>
                <p>{r.group_name}</p>
                <p>{r.academic_year}</p>
              </div>
              <div className="row wrap">
                <p>{r.is_paid ? 'Paid' : 'Unpaid'}</p>
                {isAdmin && (
                  <>
                    <button className="btn ghost" onClick={() => setEditStudent({
                      id: r.id,
                      enrollmentId: r.enrollment_id,
                      fullName: r.full_name,
                      dateOfBirth: r.date_of_birth || '',
                      fatherName: r.father_name || '',
                      motherName: r.mother_name || '',
                      mobileNumber: r.mobile_number || '',
                      email: r.email || '',
                      currentAddress: r.current_address || '',
                      hobbiesOrInterests: r.hobbies_or_interests || '',
                      medicalNeedsOrAllergies: r.medical_needs_or_allergies || '',
                      groupId: r.group_id,
                      schoolYearId: r.school_year_id,
                      status: r.status || 'active'
                    })}>Edit</button>
                    <button className="btn warn" onClick={() => archiveStudent(r.enrollment_id).catch(() => setError('Failed to archive student'))}>Archive</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row pagination-row">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <p>Page {page} of {totalPages}</p>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      {isAdmin && editStudent && (
        <div className="modal-backdrop" onClick={() => setEditStudent(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Student</h2>
            <div className="form-grid">
              <input value={editStudent.fullName} onChange={(e) => setEditStudent((v) => v ? { ...v, fullName: e.target.value } : v)} />
              <input type="date" value={editStudent.dateOfBirth} onChange={(e) => setEditStudent((v) => v ? { ...v, dateOfBirth: e.target.value } : v)} />
              <input placeholder="Father name" value={editStudent.fatherName} onChange={(e) => setEditStudent((v) => v ? { ...v, fatherName: e.target.value } : v)} />
              <input placeholder="Mother name" value={editStudent.motherName} onChange={(e) => setEditStudent((v) => v ? { ...v, motherName: e.target.value } : v)} />
              <input placeholder="Mobile" value={editStudent.mobileNumber} onChange={(e) => setEditStudent((v) => v ? { ...v, mobileNumber: e.target.value } : v)} />
              <input placeholder="Email" value={editStudent.email} onChange={(e) => setEditStudent((v) => v ? { ...v, email: e.target.value } : v)} />
              <textarea placeholder="Address" value={editStudent.currentAddress} onChange={(e) => setEditStudent((v) => v ? { ...v, currentAddress: e.target.value } : v)} />
              <textarea placeholder="Hobbies" value={editStudent.hobbiesOrInterests} onChange={(e) => setEditStudent((v) => v ? { ...v, hobbiesOrInterests: e.target.value } : v)} />
              <textarea placeholder="Medical" value={editStudent.medicalNeedsOrAllergies} onChange={(e) => setEditStudent((v) => v ? { ...v, medicalNeedsOrAllergies: e.target.value } : v)} />
              <select value={editStudent.groupId} onChange={(e) => setEditStudent((v) => v ? { ...v, groupId: e.target.value } : v)}>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={editStudent.schoolYearId} onChange={(e) => setEditStudent((v) => v ? { ...v, schoolYearId: e.target.value } : v)}>
                {schoolYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
              <select value={editStudent.status} onChange={(e) => setEditStudent((v) => v ? { ...v, status: e.target.value as 'active' | 'archived' | 'left' } : v)}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="left">Left</option>
              </select>
              <div className="row">
                <button className="btn primary" onClick={() => saveStudent().catch(() => setError('Failed to update student'))}>Save Student</button>
                <button className="btn ghost" onClick={() => setEditStudent(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

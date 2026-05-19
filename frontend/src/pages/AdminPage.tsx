import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Group = { id: string; name: string };
type SchoolYear = { id: string; name: string; sort_order?: number; sortOrder?: number };
type GroupWithSchoolYears = { id: string; name: string; school_years: SchoolYear[] };
type Student = {
  id: string;
  full_name: string;
  enrollment_id: string;
  group_name: string;
  academic_year: string;
  is_paid: boolean;
  paid_at?: string | null;
  payment_note?: string | null;
};
type Teacher = { id: string; name: string; email: string; groups: string[] };

export const AdminPage = () => {
  const { token } = useAuth();
  const [groups, setGroups] = useState<GroupWithSchoolYears[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [msg, setMsg] = useState('');

  const [studentForm, setStudentForm] = useState({
    submissionDate: '',
    fullName: '',
    schoolYearId: '',
    dateOfBirth: '',
    groupId: '',
    fatherName: '',
    motherName: '',
    mobileNumber: '',
    email: '',
    currentAddress: '',
    hobbiesOrInterests: '',
    medicalNeedsOrAllergies: ''
  });
  const [guardianForm, setGuardianForm] = useState({ studentId: '', fullName: '', phone: '', relation: '' });
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });
  const [assignForm, setAssignForm] = useState({ teacherId: '', groupId: '' });
  const [mapForm, setMapForm] = useState({ groupId: '', schoolYearId: '' });

  const loadData = async () => {
    if (!token) return;
    const [groupData, schoolYearData, studentData, teacherData] = await Promise.all([
      apiFetch<GroupWithSchoolYears[]>('/groups', {}, token),
      apiFetch<SchoolYear[]>('/school-years', {}, token),
      apiFetch<Student[]>('/students', {}, token),
      apiFetch<Teacher[]>('/admin/teachers', {}, token)
    ]);
    setGroups(groupData);
    setSchoolYears(schoolYearData);
    setStudents(studentData);
    setTeachers(teacherData);
  };

  useEffect(() => {
    loadData().catch(() => setMsg('Failed to load admin data'));
  }, [token]);

  const createStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await apiFetch('/admin/students', { method: 'POST', body: JSON.stringify(studentForm) }, token);
    setMsg('Student created');
    setStudentForm({
      submissionDate: '',
      fullName: '',
      schoolYearId: '',
      dateOfBirth: '',
      groupId: '',
      fatherName: '',
      motherName: '',
      mobileNumber: '',
      email: '',
      currentAddress: '',
      hobbiesOrInterests: '',
      medicalNeedsOrAllergies: ''
    });
    await loadData();
  };

  const createGuardian = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await apiFetch('/admin/guardians', { method: 'POST', body: JSON.stringify(guardianForm) }, token);
    setMsg('Guardian added');
    setGuardianForm({ studentId: '', fullName: '', phone: '', relation: '' });
  };

  const createTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await apiFetch('/admin/teachers', { method: 'POST', body: JSON.stringify(teacherForm) }, token);
    setMsg('Teacher saved');
    setTeacherForm({ name: '', email: '', password: '' });
    await loadData();
  };

  const assignTeacherGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await apiFetch('/admin/teacher-groups', { method: 'POST', body: JSON.stringify(assignForm) }, token);
    setMsg('Group assigned to teacher');
    await loadData();
  };

  const mapGroupSchoolYear = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await apiFetch('/admin/group-school-years', { method: 'POST', body: JSON.stringify(mapForm) }, token);
    setMsg('School year mapped to group');
    setMapForm({ groupId: '', schoolYearId: '' });
    await loadData();
  };

  const updatePayment = async (student: Student, isPaid: boolean) => {
    if (!token) return;
    const paymentNote = isPaid ? window.prompt('Optional payment note (receipt/reference):', student.payment_note || '') || '' : '';
    await apiFetch(
      `/admin/enrollments/${student.enrollment_id}/payment`,
      { method: 'PATCH', body: JSON.stringify({ isPaid, paymentNote }) },
      token
    );
    setMsg(isPaid ? 'Marked as paid' : 'Marked as unpaid');
    await loadData();
  };

  const selectedGroup = groups.find((g) => g.id === studentForm.groupId);
  const allowedSchoolYears = selectedGroup?.school_years || [];

  return (
    <section className="admin-grid">
      {msg && <div className="card"><p className="ok">{msg}</p></div>}

      <form className="card form-grid" onSubmit={createStudent}>
        <h2>Add Student</h2>
        <input type="datetime-local" value={studentForm.submissionDate} onChange={(e) => setStudentForm({ ...studentForm, submissionDate: e.target.value })} />
        <input placeholder="Student full name" value={studentForm.fullName} onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })} required />
        <input type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })} />
        <select value={studentForm.groupId} onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value, schoolYearId: '' })} required>
          <option value="">Select group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={studentForm.schoolYearId} onChange={(e) => setStudentForm({ ...studentForm, schoolYearId: e.target.value })} required>
          <option value="">{studentForm.groupId ? 'Select school year' : 'Select group first'}</option>
          {allowedSchoolYears.map((sy) => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
        </select>
        <input placeholder="Father's name" value={studentForm.fatherName} onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })} />
        <input placeholder="Mother's name" value={studentForm.motherName} onChange={(e) => setStudentForm({ ...studentForm, motherName: e.target.value })} />
        <input placeholder="Mobile number (WhatsApp)" value={studentForm.mobileNumber} onChange={(e) => setStudentForm({ ...studentForm, mobileNumber: e.target.value })} />
        <input type="email" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
        <textarea placeholder="Current address" value={studentForm.currentAddress} onChange={(e) => setStudentForm({ ...studentForm, currentAddress: e.target.value })} />
        <textarea placeholder="Hobbies or special interests" value={studentForm.hobbiesOrInterests} onChange={(e) => setStudentForm({ ...studentForm, hobbiesOrInterests: e.target.value })} />
        <textarea placeholder="Special medical needs or allergies" value={studentForm.medicalNeedsOrAllergies} onChange={(e) => setStudentForm({ ...studentForm, medicalNeedsOrAllergies: e.target.value })} />
        <button className="btn primary">Save Student</button>
      </form>

      <form className="card form-grid" onSubmit={createGuardian}>
        <h2>Add Guardian</h2>
        <select value={guardianForm.studentId} onChange={(e) => setGuardianForm({ ...guardianForm, studentId: e.target.value })} required>
          <option value="">Select student</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <input placeholder="Guardian name" value={guardianForm.fullName} onChange={(e) => setGuardianForm({ ...guardianForm, fullName: e.target.value })} required />
        <input placeholder="Phone" value={guardianForm.phone} onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })} />
        <input placeholder="Relation" value={guardianForm.relation} onChange={(e) => setGuardianForm({ ...guardianForm, relation: e.target.value })} />
        <button className="btn primary">Add Guardian</button>
      </form>

      <form className="card form-grid" onSubmit={createTeacher}>
        <h2>Create Teacher</h2>
        <input placeholder="Teacher name" value={teacherForm.name} onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })} required />
        <input type="email" placeholder="Teacher email" value={teacherForm.email} onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} required />
        <input type="password" placeholder="Temporary password" value={teacherForm.password} onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })} required />
        <button className="btn primary">Save Teacher</button>
      </form>

      <form className="card form-grid" onSubmit={assignTeacherGroup}>
        <h2>Assign Teacher Group</h2>
        <select value={assignForm.teacherId} onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })} required>
          <option value="">Select teacher</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={assignForm.groupId} onChange={(e) => setAssignForm({ ...assignForm, groupId: e.target.value })} required>
          <option value="">Select group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button className="btn primary">Assign Group</button>
      </form>

      <form className="card form-grid" onSubmit={mapGroupSchoolYear}>
        <h2>Map Group to School Year</h2>
        <select value={mapForm.groupId} onChange={(e) => setMapForm({ ...mapForm, groupId: e.target.value })} required>
          <option value="">Select group</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={mapForm.schoolYearId} onChange={(e) => setMapForm({ ...mapForm, schoolYearId: e.target.value })} required>
          <option value="">Select school year</option>
          {schoolYears.map((sy) => <option key={sy.id} value={sy.id}>{sy.name}</option>)}
        </select>
        <button className="btn primary">Save Mapping</button>
      </form>

      <div className="card">
        <h2>Teachers</h2>
        <div className="grid-list">
          {teachers.map((t) => (
            <div key={t.id} className="student">
              <div>
                <h3>{t.name}</h3>
                <p>{t.email}</p>
              </div>
              <p>{t.groups.join(', ') || 'No group assigned'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Student Payment Status</h2>
        <div className="grid-list">
          {students.map((s) => (
            <div key={s.enrollment_id} className="student">
              <div>
                <h3>{s.full_name}</h3>
                <p>{s.group_name} • {s.academic_year}</p>
                {s.paid_at && <p>Paid at: {new Date(s.paid_at).toLocaleString()}</p>}
                {s.payment_note && <p>Note: {s.payment_note}</p>}
              </div>
              <button
                className={`btn ${s.is_paid ? 'success' : 'warn'}`}
                onClick={() => updatePayment(s, !s.is_paid)}
              >
                {s.is_paid ? 'Paid' : 'Unpaid'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

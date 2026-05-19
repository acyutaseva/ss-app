import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  role: 'admin' | 'teacher';
  is_active: boolean;
};

type UsersApiResponse = {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type EditUserState = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: 'admin' | 'teacher';
  isActive: boolean;
  password: string;
};

type PasswordDialogState = {
  id: string;
  name: string;
  phoneNumber: string;
  role: 'admin' | 'teacher';
  isActive: boolean;
  password: string;
  confirmPassword: string;
};

export const VolunteersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;
  const [error, setError] = useState('');
  const [showAddVolunteer, setShowAddVolunteer] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<EditUserState | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<PasswordDialogState | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'teacher' as 'admin' | 'teacher',
    password: ''
  });
  const [addError, setAddError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [editUser, setEditUser] = useState<EditUserState | null>(null);

  const loadUsers = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    const usersData = await apiFetch<UsersApiResponse>(`/admin/users?${params.toString()}`, {}, token);
    setUsers(usersData.items);
    setTotal(usersData.total);
    setTotalPages(usersData.totalPages);
  };

  useEffect(() => {
    loadUsers().catch(() => setError('Failed to load volunteers'));
  }, [token, page]);

  const validateNewUser = () => {
    const name = userForm.name.trim();
    const email = userForm.email.trim();
    if (name.length < 2) return 'Name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (userForm.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  };

  const createUser = async () => {
    if (!token) return;
    const validationError = validateNewUser();
    if (validationError) {
      setAddError(validationError);
      return;
    }

    setAddError('');
    await apiFetch('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        phoneNumber: userForm.phoneNumber.trim() || undefined,
        role: userForm.role,
        password: userForm.password
      })
    }, token);

    setUserForm({ name: '', email: '', phoneNumber: '', role: 'teacher', password: '' });
    setShowAddVolunteer(false);
    setPage(1);
    await loadUsers();
  };

  const saveUser = async () => {
    if (!token || !editUser) return;
    await apiFetch(`/admin/users/${editUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editUser.name.trim(),
        phoneNumber: editUser.phoneNumber.trim() || undefined,
        role: editUser.role,
        isActive: editUser.isActive,
        password: editUser.password || undefined
      })
    }, token);
    setEditUser(null);
    await loadUsers();
  };

  const deactivateUser = async () => {
    if (!token || !confirmDeleteUser) return;
    await apiFetch(`/admin/users/${confirmDeleteUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: confirmDeleteUser.name,
        phoneNumber: confirmDeleteUser.phoneNumber,
        role: confirmDeleteUser.role,
        isActive: false
      })
    }, token);
    setConfirmDeleteUser(null);
    setEditUser(null);
    if (users.length === 1 && page > 1) {
      setPage((p) => Math.max(1, p - 1));
      return;
    }
    await loadUsers();
  };

  const updatePassword = async () => {
    if (!token || !passwordDialog) return;
    if (passwordDialog.password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (passwordDialog.password !== passwordDialog.confirmPassword) {
      setPasswordError('Password and confirm password do not match.');
      return;
    }
    setPasswordError('');
    await apiFetch(`/admin/users/${passwordDialog.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: passwordDialog.name,
        phoneNumber: passwordDialog.phoneNumber,
        role: passwordDialog.role,
        isActive: passwordDialog.isActive,
        password: passwordDialog.password
      })
    }, token);
    setPasswordDialog(null);
  };

  return (
    <section className="content">
      <div className="card">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2>Volunteers</h2>
          <button className="btn primary" onClick={() => { setAddError(''); setShowAddVolunteer(true); }}>Add Volunteer</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card table-wrap">
        <table className="desktop-only">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.phone_number || '-'}</td>
                <td>{u.role}</td>
                <td>
                  <span className={u.is_active ? 'payment-badge paid' : 'payment-badge unpaid'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="row wrap">
                    <button className="btn ghost contact-btn edit-btn" onClick={() => setEditUser({
                      id: u.id,
                      name: u.name,
                      email: u.email,
                      phoneNumber: u.phone_number || '',
                      role: u.role,
                      isActive: u.is_active,
                      password: ''
                    })}>
                      Edit
                    </button>
                    <button
                      className="btn ghost contact-btn"
                      onClick={() => {
                        setPasswordError('');
                        setPasswordDialog({
                          id: u.id,
                          name: u.name,
                          phoneNumber: u.phone_number || '',
                          role: u.role,
                          isActive: u.is_active,
                          password: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      Change Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mobile-only grid-list">
          {users.map((u) => (
            <article key={`${u.id}-mobile`} className={`card student ${u.is_active ? 'paid-row' : 'unpaid-row'}`}>
              <div>
                <h3>{u.name}</h3>
                <p>{u.email}</p>
                <p>{u.phone_number || '-'}</p>
                <p>{u.role}</p>
              </div>
              <div className="row wrap">
                <span className={u.is_active ? 'payment-badge paid' : 'payment-badge unpaid'}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
                <button className="btn ghost contact-btn edit-btn" onClick={() => setEditUser({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  phoneNumber: u.phone_number || '',
                  role: u.role,
                  isActive: u.is_active,
                  password: ''
                })}>
                  Edit
                </button>
                <button
                  className="btn ghost contact-btn"
                  onClick={() => {
                    setPasswordError('');
                    setPasswordDialog({
                      id: u.id,
                      name: u.name,
                      phoneNumber: u.phone_number || '',
                      role: u.role,
                      isActive: u.is_active,
                      password: '',
                      confirmPassword: ''
                    });
                  }}
                >
                  Change Password
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row pagination-row">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
          <p>Page {page} of {totalPages} • Total {total}</p>
          <button className="btn ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      {showAddVolunteer && (
        <div className="modal-backdrop" onClick={() => setShowAddVolunteer(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add Volunteer</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Name</span>
                <input value={userForm.name} onChange={(e) => setUserForm((v) => ({ ...v, name: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input type="email" value={userForm.email} onChange={(e) => setUserForm((v) => ({ ...v, email: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Phone Number</span>
                <input value={userForm.phoneNumber} onChange={(e) => setUserForm((v) => ({ ...v, phoneNumber: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-label">Role</span>
                <select value={userForm.role} onChange={(e) => setUserForm((v) => ({ ...v, role: e.target.value as 'admin' | 'teacher' }))}>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Password</span>
                <input type="password" value={userForm.password} onChange={(e) => setUserForm((v) => ({ ...v, password: e.target.value }))} />
              </label>
              <div className="row">
                <button className="btn primary" onClick={() => createUser().catch(() => setAddError('Failed to create volunteer'))}>Create Volunteer</button>
                <button className="btn ghost" onClick={() => setShowAddVolunteer(false)}>Cancel</button>
              </div>
              {addError && <p className="error">{addError}</p>}
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Volunteer</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Name</span>
                <input value={editUser.name} onChange={(e) => setEditUser((v) => v ? { ...v, name: e.target.value } : v)} />
              </label>
              <label className="field">
                <span className="field-label">Email</span>
                <input value={editUser.email} readOnly />
              </label>
              <label className="field">
                <span className="field-label">Phone Number</span>
                <input value={editUser.phoneNumber} onChange={(e) => setEditUser((v) => v ? { ...v, phoneNumber: e.target.value } : v)} />
              </label>
              <label className="field">
                <span className="field-label">Role</span>
                <select value={editUser.role} onChange={(e) => setEditUser((v) => v ? { ...v, role: e.target.value as 'admin' | 'teacher' } : v)}>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select value={editUser.isActive ? 'active' : 'inactive'} onChange={(e) => setEditUser((v) => v ? { ...v, isActive: e.target.value === 'active' } : v)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="row wrap">
                <button className="btn primary" onClick={() => saveUser().catch(() => setError('Failed to update volunteer'))}>Save</button>
                <button className="btn warn" onClick={() => setConfirmDeleteUser(editUser)}>Delete</button>
                <button className="btn ghost" onClick={() => setEditUser(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteUser && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Deactivate volunteer <strong>{confirmDeleteUser.name}</strong>?</p>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn warn" onClick={() => deactivateUser().catch(() => setError('Failed to delete volunteer'))}>Confirm</button>
              <button className="btn ghost" onClick={() => setConfirmDeleteUser(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {passwordDialog && (
        <div className="modal-backdrop" onClick={() => { setPasswordError(''); setPasswordDialog(null); }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Change Password</h2>
            <p>Volunteer: <strong>{passwordDialog.name}</strong></p>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <label className="field">
                <span className="field-label">New Password</span>
                <input
                  type="password"
                  value={passwordDialog.password}
                  onChange={(e) => setPasswordDialog((v) => v ? { ...v, password: e.target.value } : v)}
                />
              </label>
              <label className="field">
                <span className="field-label">Confirm Password</span>
                <input
                  type="password"
                  value={passwordDialog.confirmPassword}
                  onChange={(e) => setPasswordDialog((v) => v ? { ...v, confirmPassword: e.target.value } : v)}
                />
              </label>
              {passwordError && <p className="error">{passwordError}</p>}
              <div className="row">
                <button className="btn primary" onClick={() => updatePassword().catch(() => setPasswordError('Failed to update password'))}>Update Password</button>
                <button className="btn ghost" onClick={() => { setPasswordError(''); setPasswordDialog(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  is_active: boolean;
};

export const VolunteersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'teacher' as 'admin' | 'teacher', password: '' });
  const [editUser, setEditUser] = useState<{ id: string; name: string; role: 'admin' | 'teacher'; isActive: boolean; password: string } | null>(null);

  const loadUsers = async () => {
    if (!token) return;
    const usersData = await apiFetch<UserRow[]>('/admin/users', {}, token);
    setUsers(usersData);
  };

  useEffect(() => {
    loadUsers().catch(() => setError('Failed to load users'));
  }, [token]);

  const createUser = async () => {
    if (!token) return;
    await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(userForm) }, token);
    setUserForm({ name: '', email: '', role: 'teacher', password: '' });
    await loadUsers();
  };

  const saveUser = async () => {
    if (!token || !editUser) return;
    await apiFetch(`/admin/users/${editUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editUser.name,
        role: editUser.role,
        isActive: editUser.isActive,
        password: editUser.password || undefined
      })
    }, token);
    setEditUser(null);
    await loadUsers();
  };

  return (
    <section className="content">
      <div className="card">
        <h2>Volunteer Management</h2>
        <div className="row wrap">
          <input placeholder="Name" value={userForm.name} onChange={(e) => setUserForm((v) => ({ ...v, name: e.target.value }))} />
          <input placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm((v) => ({ ...v, email: e.target.value }))} />
          <select value={userForm.role} onChange={(e) => setUserForm((v) => ({ ...v, role: e.target.value as 'admin' | 'teacher' }))}>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <input placeholder="Password" type="password" value={userForm.password} onChange={(e) => setUserForm((v) => ({ ...v, password: e.target.value }))} />
          <button className="btn primary" onClick={() => createUser().catch(() => setError('Failed to create user'))}>Add Volunteer</button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h2>Volunteers</h2>
        <div className="grid-list">
          {users.map((u) => (
            <div key={u.id} className="student card">
              <div>
                <h3>{u.name}</h3>
                <p>{u.email}</p>
                <p>{u.role} • {u.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <button className="btn ghost" onClick={() => setEditUser({ id: u.id, name: u.name, role: u.role, isActive: u.is_active, password: '' })}>Edit</button>
            </div>
          ))}
        </div>
      </div>

      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Volunteer</h2>
            <div className="form-grid">
              <input value={editUser.name} onChange={(e) => setEditUser((v) => v ? { ...v, name: e.target.value } : v)} />
              <select value={editUser.role} onChange={(e) => setEditUser((v) => v ? { ...v, role: e.target.value as 'admin' | 'teacher' } : v)}>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <select value={editUser.isActive ? 'active' : 'inactive'} onChange={(e) => setEditUser((v) => v ? { ...v, isActive: e.target.value === 'active' } : v)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <input placeholder="New password (optional)" type="password" value={editUser.password} onChange={(e) => setEditUser((v) => v ? { ...v, password: e.target.value } : v)} />
              <div className="row">
                <button className="btn primary" onClick={() => saveUser().catch(() => setError('Failed to update user'))}>Save</button>
                <button className="btn ghost" onClick={() => setEditUser(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

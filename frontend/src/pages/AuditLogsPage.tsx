import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

type AuditLogRow = {
  id: string;
  actor_name?: string | null;
  actor_role?: string | null;
  method: string;
  path: string;
  status_code: number;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at: string;
};

type AuditLogsResponse = {
  items: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const toDisplayDateTime = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString('en-AU');
};

export const AuditLogsPage = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [error, setError] = useState('');
  const pageSize = 20;

  const loadRows = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (search.trim()) params.set('search', search.trim());
    if (method) params.set('method', method);

    const data = await apiFetch<AuditLogsResponse>(`/admin/audit-logs?${params.toString()}`, {}, token);
    setRows(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  };

  useEffect(() => {
    if (!token) return;
    loadRows().catch(() => setError('Failed to load audit logs'));
  }, [token, page, method, search]);

  const methodBadgeClass = useMemo(() => {
    return (m: string) => {
      if (m === 'POST') return 'payment-badge paid';
      if (m === 'PATCH' || m === 'PUT') return 'payment-badge unpaid';
      if (m === 'DELETE') return 'btn warn';
      return 'payment-badge';
    };
  }, []);

  return (
    <section className="content">
      <div className="card">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <h2>Audit Logs</h2>
          <p className="eyebrow">Total entries: {total}</p>
        </div>
        <div className="audit-log-filters-row">
          <input
            className="audit-log-filter-control"
            placeholder="Search actor/path/entity"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className="audit-log-filter-control"
            value={method}
            onChange={(e) => {
              setPage(1);
              setMethod(e.target.value);
            }}
          >
            <option value="">All methods</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card table-wrap">
        <table className="desktop-only">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Method</th>
              <th>Path</th>
              <th>Status</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{toDisplayDateTime(r.created_at)}</td>
                <td>{r.actor_name || 'System'} {r.actor_role ? `(${r.actor_role})` : ''}</td>
                <td><span className={methodBadgeClass(r.method)}>{r.method}</span></td>
                <td>{r.path}</td>
                <td>{r.status_code}</td>
                <td>{r.entity_type || '-'} {r.entity_id ? `(${r.entity_id})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mobile-only grid-list">
          {rows.map((r) => (
            <article className="card student" key={`${r.id}-mobile`}>
              <p><strong>{toDisplayDateTime(r.created_at)}</strong></p>
              <p>{r.actor_name || 'System'} {r.actor_role ? `(${r.actor_role})` : ''}</p>
              <p>{r.method} • {r.status_code}</p>
              <p>{r.path}</p>
              <p>{r.entity_type || '-'} {r.entity_id ? `(${r.entity_id})` : ''}</p>
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
    </section>
  );
};

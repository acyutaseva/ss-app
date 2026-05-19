import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { getStudentAvatarUrl } from '../utils/studentAvatar';

type TermRow = {
  student_id: string;
  full_name: string;
  group_name: string;
  present_days: string;
};

export const ReportsPage = () => {
  const { token } = useAuth();
  const [termStart, setTermStart] = useState('2026-01-01');
  const [termEnd, setTermEnd] = useState('2026-03-31');
  const [rows, setRows] = useState<TermRow[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page]);

  const load = async () => {
    if (!token) return;
    const data = await apiFetch<TermRow[]>(`/reports/term?termStart=${termStart}&termEnd=${termEnd}`, {}, token);
    setRows(data);
    setPage(1);
  };

  const exportCsv = () => {
    if (!rows.length) return;

    const escapeCsv = (value: string | number) => {
      const str = String(value ?? '');
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = ['Student', 'Group', 'Present Days'];
    const lines = rows.map((row) => [
      escapeCsv(row.full_name),
      escapeCsv(row.group_name),
      escapeCsv(row.present_days)
    ].join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `term-attendance-${termStart}-to-${termEnd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div className="card">
        <h2>Term Attendance</h2>
        <div className="term-attendance-controls">
          <input className="term-attendance-date" type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
          <input className="term-attendance-date" type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
          <button className="btn primary term-attendance-generate" onClick={load}>Generate</button>
          <button className="btn ghost term-attendance-generate" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Group</th>
              <th>Present Days</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.student_id}>
                <td><span className="student-name-cell"><img className="student-avatar student-avatar-sm" src={getStudentAvatarUrl(row.student_id)} alt="Student avatar" loading="lazy" />{row.full_name}</span></td>
                <td>{row.group_name}</td>
                <td>{row.present_days}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!!rows.length && (
          <div className="row wrap pagination-row" style={{ marginTop: 10 }}>
            <button
              className="btn ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <p className="eyebrow">Page {page} of {totalPages}</p>
            <button
              className="btn ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

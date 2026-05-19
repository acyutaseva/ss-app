import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

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

  const load = async () => {
    if (!token) return;
    const data = await apiFetch<TermRow[]>(`/reports/term?termStart=${termStart}&termEnd=${termEnd}`, {}, token);
    setRows(data);
  };

  return (
    <section>
      <div className="card">
        <h2>Term Attendance</h2>
        <div className="row wrap">
          <input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
          <input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
          <button className="btn primary" onClick={load}>Generate</button>
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
            {rows.map((row) => (
              <tr key={row.student_id}>
                <td>{row.full_name}</td>
                <td>{row.group_name}</td>
                <td>{row.present_days}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  attendance_mode: 'full' | 'checkin_only';
  applies_all_groups: boolean;
  notes?: string | null;
  group_names: string[];
};

type EventExportReport = {
  event: EventRow;
  report: {
    taught_summary: string;
    other_notes?: string | null;
    submitted_by_name?: string | null;
    submitted_at: string;
    updated_at: string;
  } | null;
  attended: {
    full_name: string;
    group_name: string;
    checkin_time?: string | null;
    checkout_time?: string | null;
    dropped_by?: string | null;
    picked_by_name?: string | null;
    picked_by_type?: string | null;
    notes?: string | null;
  }[];
};

const API_BASE = import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || '/api';

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

const toDisplayDateTime = (value?: string | null) => {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString('en-AU', { timeZone: 'Australia/Perth' });
};

export const PublicEventReportPage = () => {
  const { eventId } = useParams();
  const [data, setData] = useState<EventExportReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!eventId) {
        setError('Missing event id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/public/events/${eventId}/export-report`);
        const body = await res.json().catch(() => ({ message: 'Failed to load report' }));
        if (!res.ok) {
          throw new Error(body.message || 'Failed to load report');
        }
        if (!active) return;
        setData(body as EventExportReport);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [eventId]);

  const sortedAttended = useMemo(() => {
    if (!data) return [];
    if (data.event.attendance_mode !== 'checkin_only') return data.attended;
    return [...data.attended].sort((a, b) => a.full_name.localeCompare(b.full_name, 'en-AU', { sensitivity: 'base' }));
  }, [data]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading report...</div>;
  }

  if (error || !data) {
    return <div style={{ padding: 24, color: '#b42318', fontFamily: 'Arial, sans-serif' }}>{error || 'Report not found'}</div>;
  }

  const event = data.event;
  const exportedAt = new Date().toLocaleString('en-AU');
  const eventTime = `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`;
  const groupLabel = event.applies_all_groups ? 'All groups' : (event.group_names || []).join(', ') || 'Selected groups';
  const isCheckinOnly = event.attendance_mode === 'checkin_only';

  return (
    <>
      <style>{`
        :root {
          color-scheme: light;
          --brand-a: #0f766e;
          --brand-b: #164e63;
          --paper: #ffffff;
          --muted-bg: #f2f8f6;
          --line: #d7ddd1;
        }
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          color: #202820;
          margin: 24px;
          line-height: 1.45;
          background: radial-gradient(circle at top right, #d9efe7, #f4f6f1 42%);
        }
        .public-report-shell {
          max-width: 1100px;
          margin: 0 auto;
        }
        .report-shell {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 10px 28px rgba(15, 70, 60, 0.12);
        }
        .hero {
          background: linear-gradient(135deg, var(--brand-a), var(--brand-b));
          color: #ffffff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 14px;
        }
        .toolbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 16px;
        }
        .toolbar button {
          border: 0;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: 700;
          background: #0f766e;
          color: #ffffff;
          cursor: pointer;
        }
        h1 {
          margin: 0 0 4px;
          font-size: 26px;
        }
        h2 {
          margin: 24px 0 8px;
          font-size: 18px;
          border-bottom: 1px solid #d7ddd1;
          padding-bottom: 6px;
          color: #114b57;
        }
        .meta {
          color: #5f665f;
          margin: 0 0 18px;
        }
        .hero .meta {
          color: #e7f5f1;
          margin: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 18px;
        }
        .item {
          background: var(--muted-bg);
          border: 1px solid #dce8e3;
          border-radius: 8px;
          padding: 10px;
        }
        .item strong {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          color: #3f6d66;
        }
        .box {
          border: 1px solid #d7ddd1;
          border-radius: 8px;
          padding: 12px;
          white-space: pre-wrap;
          background: #f8fbf6;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 13px;
        }
        th, td {
          text-align: left;
          border-bottom: 1px solid #d7ddd1;
          padding: 8px 6px;
          vertical-align: top;
        }
        th {
          background: #dff1ed;
          color: #0f5c55;
          font-weight: 700;
          white-space: nowrap;
        }
        tbody tr:nth-child(even) {
          background: #f7fbfa;
        }
        @media print {
          body {
            margin: 12mm;
          }
          .toolbar {
            display: none;
          }
          .report-shell {
            box-shadow: none;
            border-color: #d7ddd1;
          }
          th {
            background: #dff1ed !important;
          }
          .box {
            background: #f8fbf6 !important;
          }
          .item {
            background: #f2f8f6 !important;
          }
          h2 {
            break-after: avoid;
          }
          tr {
            break-inside: avoid;
          }
        }
        @media (max-width: 700px) {
          body {
            margin: 14px;
          }
          .grid {
            grid-template-columns: 1fr;
          }
          table {
            font-size: 12px;
          }
          th, td {
            padding: 6px 4px;
          }
        }
      `}</style>

      <div className="public-report-shell">
        <div className="toolbar">
          <button onClick={() => window.print()}>Print / Save PDF</button>
        </div>
        <main className="report-shell">
          <section className="hero">
            <h1>{event.name}</h1>
            <p className="meta">Event report exported {exportedAt}</p>
          </section>

          <h2>Event Details</h2>
          <div className="grid">
            <div className="item"><strong>Date</strong>{toDisplayDate(event.event_date)}</div>
            <div className="item"><strong>Time</strong>{eventTime}</div>
            <div className="item"><strong>Mode</strong>{isCheckinOnly ? 'Check-in only' : 'Full check-in and check-out'}</div>
            <div className="item"><strong>Groups</strong>{groupLabel}</div>
          </div>

          {event.notes ? (
            <>
              <h2>Event Notes</h2>
              <div className="box">{event.notes}</div>
            </>
          ) : null}

          <h2>Event Report</h2>
          {data.report ? (
            <>
              <div className="box">{data.report.taught_summary}</div>
              {data.report.other_notes ? (
                <>
                  <h2>Other Notes</h2>
                  <div className="box">{data.report.other_notes}</div>
                </>
              ) : null}
              <p className="meta">
                Submitted by {data.report.submitted_by_name || 'Unknown'} on {toDisplayDateTime(data.report.updated_at || data.report.submitted_at)}
              </p>
            </>
          ) : (
            <p className="meta">No event report submitted.</p>
          )}

          <h2>Attended ({sortedAttended.length})</h2>
          {sortedAttended.length ? (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Group</th>
                  {!isCheckinOnly ? <th>Check In</th> : null}
                  {!isCheckinOnly ? <th>Check Out</th> : null}
                  {!isCheckinOnly ? <th>Dropped By</th> : null}
                  {!isCheckinOnly ? <th>Picked By</th> : null}
                  {!isCheckinOnly ? <th>Notes</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedAttended.map((row, index) => (
                  <tr key={`${row.full_name}-${row.group_name}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{row.full_name}</td>
                    <td>{row.group_name}</td>
                    {!isCheckinOnly ? <td>{toDisplayDateTime(row.checkin_time)}</td> : null}
                    {!isCheckinOnly ? <td>{toDisplayDateTime(row.checkout_time)}</td> : null}
                    {!isCheckinOnly ? <td>{row.dropped_by || '-'}</td> : null}
                    {!isCheckinOnly ? <td>{row.picked_by_name || row.picked_by_type || '-'}</td> : null}
                    {!isCheckinOnly ? <td>{row.notes || '-'}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="meta">No attended students.</p>
          )}
        </main>
      </div>
    </>
  );
};

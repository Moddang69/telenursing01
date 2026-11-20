import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './AdminAuditLogPage.css';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    adminService.getAuditLogs()
      .then(setLogs)
      .catch((err) => {
        console.error('AdminAuditLogPage load error:', err);
        setError(true);
      });
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message="ไม่สามารถโหลด Audit Log ได้" onRetry={load} />;
  if (!logs) return <LoadingState />;

  const filtered = logs.filter(
    (l) => l.user.toLowerCase().includes(query.toLowerCase()) || l.action.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="admin-audit-page">
      <h1>Audit Log</h1>
      <input
        className="form-input"
        style={{ maxWidth: 320, marginBottom: 16 }}
        placeholder="ค้นหาผู้ใช้งานหรือ Action"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="ไม่พบข้อมูล Audit Log" />
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>ผู้ใช้งาน</th><th>Action</th><th>Target</th><th>วันที่/เวลา</th><th>ผลลัพธ์</th></tr>
          </thead>
          <tbody>
            {[...filtered].reverse().map((log) => (
              <tr key={log.id}>
                <td>{log.user}</td>
                <td>{log.action}</td>
                <td>{log.target}</td>
                <td>{log.datetime}</td>
                <td><span className="audit-result-tag">{log.result}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
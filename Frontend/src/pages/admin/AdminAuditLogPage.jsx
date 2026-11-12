import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import './AdminAuditLogPage.css';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => { adminService.getAuditLogs().then(setLogs); }, []);

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
        <EmptyState icon="🧾" title="ไม่พบข้อมูล Audit Log" />
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
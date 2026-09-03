import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { fmtDateTime, fmtMin } from '../../utils/calculations.js';
import { StatusPill, AlertBadge, EmptyState } from '../Shared.jsx';


/* ============================================================
   SCREEN 5 — PATIENT RECORDS
   ============================================================ */
function PatientRecordsScreen({ list, onAddClick, onEditClick, onDeleteClick, onResetClick, simulatedNowMin }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const searched = useMemo(() => {
    let base = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    return base.slice().sort((a, b) => (b.arrival || 0) - (a.arrival || 0));
  }, [list, search]);

  const pageCount = Math.max(1, Math.ceil(searched.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageItems = searched.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search by name or patient ID…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ fontFamily: 'inherit', fontSize: 12.5, padding: '7px 11px', borderRadius: 7, border: '1px solid var(--line)', minWidth: 220 }}
          aria-label="Search patients"
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ops-btn" onClick={onResetClick}><RotateCcw size={13} />Reset to original dataset</button>
          <button className="ops-btn ops-btn-primary" onClick={onAddClick}><Plus size={14} />Add patient</button>
        </div>
      </div>

      {searched.length === 0 ? <EmptyState text="No patients match your search or filters." /> : (
        <>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Department</th><th>Priority</th><th>Status</th>
                  <th>Arrival</th><th>Wait to consult</th><th>Alert</th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.id}>
                    <td className="ops-mono">{p.id}{!p.isSeed && <span className="ops-badge ops-badge-neutral" style={{ marginLeft: 6 }}>New</span>}</td>
                    <td>{p.name}</td>
                    <td>{p.department}</td>
                    <td>{p.priority}</td>
                    <td><StatusPill status={p.status} /></td>
                    <td className="ops-mono">{fmtDateTime(p.arrival)}</td>
                    <td className="ops-mono">{fmtMin(p.m.waitToConsult)}</td>
                    <td><AlertBadge flag={p.m.alertFlag} /></td>
                    <td><button className="ops-btn ops-btn-ghost ops-btn-sm" onClick={() => onEditClick(p)} aria-label={`Edit ${p.name}`}><Pencil size={13} /></button></td>
                    <td><button className="ops-btn ops-btn-ghost ops-btn-sm ops-btn-danger" onClick={() => onDeleteClick(p)} aria-label={`Delete ${p.name}`}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
            <div>Showing {clampedPage * pageSize + 1}–{Math.min(searched.length, (clampedPage + 1) * pageSize)} of {searched.length}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="ops-btn ops-btn-sm" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)}>Previous</button>
              <button className="ops-btn ops-btn-sm" disabled={clampedPage >= pageCount - 1} onClick={() => setPage(clampedPage + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


export default PatientRecordsScreen;

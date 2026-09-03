import React, { useMemo } from 'react';
import { AlertTriangle, Info, ListOrdered } from 'lucide-react';
import { fmtDateTime } from '../../utils/calculations.js';
import { ElapsedTime } from '../Shared.jsx';

const PRIORITY_ORDER = { Emergency: 0, Urgent: 1, Routine: 2 };

function PriorityBadge({ priority }) {
  const map = { Emergency: 'ops-badge-bad', Urgent: 'ops-badge-warn', Routine: 'ops-badge-neutral' };
  return <span className={`ops-badge ${map[priority] || 'ops-badge-neutral'}`}>{priority}</span>;
}
function StatusPillLocal({ status }) {
  const map = { Waiting: 'ops-badge-warn', 'In Consultation': 'ops-badge-neutral' };
  return <span className={`ops-badge ${map[status] || 'ops-badge-neutral'}`}>{status}</span>;
}

/**
 * Triage / Priority Queue Management.
 * Reuses, without redefining:
 *  - the existing "currently active" definition (status !== 'Completed')
 *  - the existing Priority values already in the dataset
 *  - the existing ElapsedTime wait calculation (Shared.jsx), same component
 *    and same sinceMin rule the Dashboard already uses: In Consultation ->
 *    elapsed since consultStart, Waiting -> elapsed since arrival, both
 *    against the app's existing simulatedNowMin clock.
 * No second wait-time formula is introduced.
 */
export default function TriageScreen({ list, simulatedNowMin }) {
  const activeQueue = useMemo(() => {
    return list
      .filter((p) => p.status !== 'Completed')
      .slice()
      .sort((a, b) => {
        const pOrder = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pOrder !== 0) return pOrder;
        return (a.arrival ?? 0) - (b.arrival ?? 0);
      })
      .map((p) => ({ ...p, sinceMin: p.status === 'In Consultation' ? p.consultStart : p.arrival }));
  }, [list]);

  const counts = useMemo(() => {
    const c = { Emergency: 0, Urgent: 0, Routine: 0 };
    activeQueue.forEach((p) => { c[p.priority] = (c[p.priority] || 0) + 1; });
    return c;
  }, [activeQueue]);

  const longestWaitMin = useMemo(() => {
    if (activeQueue.length === 0) return null;
    const elapsed = activeQueue.map((p) => Math.max(0, Math.round(simulatedNowMin - p.sinceMin)));
    return Math.max(...elapsed);
  }, [activeQueue, simulatedNowMin]);

  const hasEmergencyWaiting = counts.Emergency > 0;
  const hasUrgentWaiting = counts.Urgent > 0;
  const hasLowerBehindHigher = activeQueue.some((p, i) => p.priority === 'Routine' && activeQueue.slice(0, i).some((q) => q.priority !== 'Routine'));

  return (
    <div>
      <div className="ops-info-box" style={{ marginBottom: 18 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <div>This view organizes the existing patient queue by priority (Emergency to Urgent to
          Routine) using the Priority values already recorded for each patient, then by arrival time
          within each priority. It does not diagnose, classify, or assign priority - that
          classification already exists in the dataset and remains a clinical decision made by
          qualified healthcare professionals.</div>
      </div>

      <div className="ops-card-title" style={{ marginBottom: 8 }}>Priority Queue Summary</div>
      <div className="ops-grid ops-kpi-grid" style={{ marginBottom: 18 }}>
        <div className="ops-card ops-kpi">
          <div className="ops-kpi-label">Emergency waiting</div>
          <div className="ops-kpi-value" style={{ color: 'var(--bad)' }}>{counts.Emergency}</div>
        </div>
        <div className="ops-card ops-kpi">
          <div className="ops-kpi-label">Urgent waiting</div>
          <div className="ops-kpi-value" style={{ color: 'var(--warn)' }}>{counts.Urgent}</div>
        </div>
        <div className="ops-card ops-kpi">
          <div className="ops-kpi-label">Routine waiting</div>
          <div className="ops-kpi-value">{counts.Routine}</div>
        </div>
        <div className="ops-card ops-kpi">
          <div className="ops-kpi-label">Longest current wait</div>
          <div className="ops-kpi-value">
            {longestWaitMin != null ? <ElapsedTime sinceMin={simulatedNowMin - longestWaitMin} nowMin={simulatedNowMin} /> : '\u2014'}
          </div>
          <div className="ops-kpi-sub">across all currently active patients</div>
        </div>
      </div>

      {activeQueue.length === 0 ? (
        <div className="ops-empty">
          <AlertTriangle size={26} aria-hidden="true" />
          <div>No patients are currently active (Waiting or In Consultation) under the current filters.</div>
        </div>
      ) : (
        <>
          <div className="ops-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ListOrdered size={15} aria-hidden="true" /> Priority Queue ({activeQueue.length} active)
          </div>
          <div className="ops-table-wrap" style={{ marginBottom: 18 }}>
            <table className="ops-table">
              <thead>
                <tr><th>#</th><th>Patient ID</th><th>Name</th><th>Department</th><th>Priority</th><th>Status</th><th>Arrival</th><th>Current wait</th></tr>
              </thead>
              <tbody>
                {activeQueue.map((p, i) => (
                  <tr key={p.id}>
                    <td className="ops-mono">{i + 1}</td>
                    <td className="ops-mono">{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.department}</td>
                    <td><PriorityBadge priority={p.priority} /></td>
                    <td><StatusPillLocal status={p.status} /></td>
                    <td className="ops-mono">{fmtDateTime(p.arrival)}</td>
                    <td><ElapsedTime sinceMin={p.sinceMin} nowMin={simulatedNowMin} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="ops-card-title" style={{ marginBottom: 8 }}>Operational Insight</div>
      <div className="ops-card" style={{ marginBottom: 18 }}>
        {activeQueue.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No patients are currently active in the queue.</div>
        )}
        {hasEmergencyWaiting && (
          <div className="ops-recline" style={{ background: 'var(--bad-soft)' }}>
            <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--bad)' }} aria-hidden="true" />
            <div style={{ fontSize: 12.5 }}>Emergency-priority patients are currently waiting. Priority-based
              queue management should be followed according to established clinical protocols.</div>
          </div>
        )}
        {hasUrgentWaiting && (
          <div className="ops-recline" style={{ background: 'var(--warn-soft)' }}>
            <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--warn)' }} aria-hidden="true" />
            <div style={{ fontSize: 12.5 }}>Urgent-priority patients are present in the queue. Management may
              monitor their waiting time alongside Emergency demand.</div>
          </div>
        )}
        {hasLowerBehindHigher && (
          <div className="ops-recline" style={{ background: 'var(--line-soft)' }}>
            <Info size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--ink-soft)' }} aria-hidden="true" />
            <div style={{ fontSize: 12.5 }}>Lower-priority patients may experience longer waits when
              higher-priority cases enter the queue. This is an expected trade-off of priority-based
              queue management.</div>
          </div>
        )}
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 10, fontStyle: 'italic' }}>
          Triage prioritizes patients according to urgency. It may improve priority-sensitive patient
          flow, but prioritizing higher-priority patients can increase waiting time for lower-priority
          patients. This module is a queue-prioritization tool and does not claim a guaranteed
          reduction in overall waiting time.
        </div>
      </div>
    </div>
  );
}

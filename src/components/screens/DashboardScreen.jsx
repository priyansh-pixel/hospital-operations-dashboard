import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { computeKPIs, computeDeptPerformance, computeHourly, computePeak, computeRecommendations, fmtMin } from '../../utils/calculations.js';
import { EmptyState, KpiCard, CurrentlyActivePanel, VarianceTag, StatusBadge } from '../Shared.jsx';

/* ============================================================
   SCREEN 1 — EXECUTIVE OPERATIONS DASHBOARD
   ============================================================ */
function DashboardScreen({ list, allList, simulatedNowMin }) {
  const kpi = useMemo(() => computeKPIs(list), [list]);
  const deptPerf = useMemo(() => computeDeptPerformance(list), [list]);
  const hourly = useMemo(() => computeHourly(list), [list]);
  const peak = useMemo(() => computePeak(hourly), [hourly]);
  const recs = useMemo(() => computeRecommendations(deptPerf, peak, kpi.breachRate), [deptPerf, peak, kpi.breachRate]);

  if (list.length === 0) return <EmptyState text="No patients match the current filters." />;

  return (
    <div>
      <div className="ops-grid ops-kpi-grid" style={{ marginBottom: 18 }}>
        <KpiCard label="Total patients" value={kpi.total} sub={`of ${allList.length} in dataset`} />
        <KpiCard label="Avg wait to consult" value={fmtMin(kpi.avgWait)} sub={`n=${kpi.consultedCount} consulted`} />
        <KpiCard label="Median wait to consult" value={fmtMin(kpi.medianWait)} />
        <KpiCard label="P90 wait to consult" value={fmtMin(kpi.p90Wait)} sub="90% of patients wait under this" />
        <KpiCard label="Target-breach rate" value={kpi.breachRate != null ? `${kpi.breachRate}%` : '—'} sub={`${kpi.breachCount} of ${kpi.consultedCount} patients`} />
        <KpiCard label="Currently waiting" value={kpi.currentlyWaiting} live={kpi.currentlyWaiting > 0} />
        <KpiCard label="In consultation" value={kpi.currentlyInConsultation} live={kpi.currentlyInConsultation > 0} />
      </div>

      <CurrentlyActivePanel list={list} simulatedNowMin={simulatedNowMin} />

      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div className="ops-card-title">Manager's attention</div>
        {recs.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No departments currently exceed the overall breach-rate baseline.</div>
          : recs.map((r, i) => (
            <div key={i} className="ops-recline" style={{ background: r.severity === 'bad' ? 'var(--bad-soft)' : r.severity === 'warn' ? 'var(--warn-soft)' : 'var(--line-soft)' }}>
              <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0, color: r.severity === 'bad' ? 'var(--bad)' : r.severity === 'warn' ? 'var(--warn)' : 'var(--ink-soft)' }} aria-hidden="true" />
              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{r.text}</div>
            </div>
          ))}
      </div>

      <div className="ops-card-title" style={{ marginBottom: 8 }}>Average wait vs. department target</div>
      <div className="ops-card" style={{ marginBottom: 18 }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={deptPerf.map((d) => ({ name: d.name.replace(' OPD', ''), 'Avg wait': d.avgWait || 0, Target: d.target }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11.5 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'minutes', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v} min`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Avg wait" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Target" fill="#B7C3C8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="ops-card-title" style={{ marginBottom: 8 }}>Department performance</div>
      <div className="ops-table-wrap">
        <table className="ops-table ops-table-fixed">
          <colgroup>
            <col style={{ width: '15%' }} /><col style={{ width: '8%' }} /><col style={{ width: '11%' }} />
            <col style={{ width: '9%' }} /><col style={{ width: '7%' }} /><col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} /><col style={{ width: '10%' }} /><col style={{ width: '9%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Department</th><th>Patients</th><th>Avg wait</th><th>Median</th><th>P90</th>
              <th>Target</th><th>Variance</th><th>Breach rate</th><th>Utilization</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deptPerf.map((d) => (
              <tr key={d.name}>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td className="ops-mono">{d.count}</td>
                <td className="ops-mono">{fmtMin(d.avgWait)}</td>
                <td className="ops-mono">{fmtMin(d.medianWait)}</td>
                <td className="ops-mono">{fmtMin(d.p90Wait)}</td>
                <td className="ops-mono">{fmtMin(d.target)}</td>
                <td><VarianceTag v={d.variance} /></td>
                <td className="ops-mono">{d.breachRate != null ? `${d.breachRate}%` : '—'}</td>
                <td className="ops-mono">{d.utilization}</td>
                <td><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default DashboardScreen;

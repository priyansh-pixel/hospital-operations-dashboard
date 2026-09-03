import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { computeKPIs, computeDeptPerformance, computeHourly, computePeak, computeRecommendations, fmtMin } from '../../utils/calculations.js';
import { VarianceTag, StatusBadge } from '../Shared.jsx';


/* ============================================================
   SCREEN 3 — DEPARTMENT & BOTTLENECK ANALYSIS
   ============================================================ */
function DepartmentsScreen({ list }) {
  const deptPerf = useMemo(() => computeDeptPerformance(list), [list]);
  const kpi = useMemo(() => computeKPIs(list), [list]);
  const hourly = useMemo(() => computeHourly(list), [list]);
  const peak = useMemo(() => computePeak(hourly), [hourly]);
  const recs = useMemo(() => computeRecommendations(deptPerf, peak, kpi.breachRate).filter((r) => r.type === 'capacity' || r.type === 'attention'), [deptPerf, peak, kpi.breachRate]);

  const chartData = deptPerf.map((d) => ({ name: d.name.replace(' OPD', ''), 'Avg wait': d.avgWait || 0, Target: d.target }));

  return (
    <div>
      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div className="ops-card-title">Average wait vs. target, by department</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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

      <div className="ops-table-wrap" style={{ marginBottom: 18 }}>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Department</th><th>Doctors</th><th>Demand share</th><th>Service time</th>
              <th>Utilization</th><th>Patients</th><th>Avg wait</th><th>Target</th>
              <th>Variance</th><th>Breach rate</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deptPerf.map((d) => (
              <tr key={d.name}>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td className="ops-mono">{d.doctors}</td>
                <td className="ops-mono">{Math.round(d.demandShare * 100)}%</td>
                <td className="ops-mono">{fmtMin(d.serviceTime)}</td>
                <td className="ops-mono">{d.utilization}</td>
                <td className="ops-mono">{d.count}</td>
                <td className="ops-mono">{fmtMin(d.avgWait)}</td>
                <td className="ops-mono">{fmtMin(d.target)}</td>
                <td><VarianceTag v={d.variance} /></td>
                <td className="ops-mono">{d.breachRate != null ? `${d.breachRate}%` : '—'}</td>
                <td><StatusBadge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ops-card">
        <div className="ops-card-title">Operational diagnosis</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
          Status rule: <strong>Green</strong> = breach rate at or below the overall baseline ({kpi.breachRate}%).{' '}
          <strong>Red</strong> = breach rate above baseline <em>and</em> utilization index above 1.0 (structural
          capacity pressure). <strong>Amber</strong> = breach rate above baseline without elevated utilization.
        </div>
        {recs.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No department currently shows elevated breach rate relative to the overall baseline.</div>
          : recs.map((r, i) => (
            <div key={i} className="ops-recline" style={{ background: r.severity === 'bad' ? 'var(--bad-soft)' : 'var(--warn-soft)' }}>
              <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0, color: r.severity === 'bad' ? 'var(--bad)' : 'var(--warn)' }} aria-hidden="true" />
              <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{r.text}</div>
            </div>
          ))}
      </div>
    </div>
  );
}


export default DepartmentsScreen;

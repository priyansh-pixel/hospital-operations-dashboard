import React, { useState, useMemo } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { computeKPIs, computeDeptPerformance, computeHourly, computePeak, computeDailyReport, fmtMin } from '../../utils/calculations.js';
import { KpiCard, EmptyState } from '../Shared.jsx';

/* ============================================================
   SCREEN 6 — REPORTS & ALERTS
   ============================================================ */
function ReportsAlertsScreen({ list }) {
  const [tab, setTab] = useState('alerts');
  const kpi = useMemo(() => computeKPIs(list), [list]);
  const deptPerf = useMemo(() => computeDeptPerformance(list), [list]);
  const hourly = useMemo(() => computeHourly(list), [list]);
  const peak = useMemo(() => computePeak(hourly), [hourly]);
  const daily = useMemo(() => computeDailyReport(list), [list]);
  const deptAlerts = deptPerf.filter((d) => d.status !== 'Green');

  return (
    <div>
      <div className="ops-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'alerts'} className={`ops-tab${tab === 'alerts' ? ' active' : ''}`} onClick={() => setTab('alerts')}>Alerts</button>
        <button role="tab" aria-selected={tab === 'report'} className={`ops-tab${tab === 'report' ? ' active' : ''}`} onClick={() => setTab('report')}>Daily report</button>
      </div>

      {tab === 'alerts' && (
        <div>
          <div className="ops-grid ops-kpi-grid" style={{ marginBottom: 18 }}>
            <KpiCard label="Patient-level breaches" value={kpi.breachCount} sub={`${kpi.breachRate}% of ${kpi.consultedCount} consulted`} />
            <KpiCard label="Departments flagged" value={deptAlerts.length} sub="performance or capacity attention" />
            <KpiCard label="Peak-demand hours" value={peak.peakHours.length} sub={peak.peakHours.map((h) => `${h}:00`).join(', ') || 'none currently'} />
          </div>

          <div className="ops-card-title" style={{ marginBottom: 8 }}>Department-level alerts</div>
          <div className="ops-card" style={{ marginBottom: 18 }}>
            {deptAlerts.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No departments currently exceed the overall breach-rate baseline.</div>
            ) : deptAlerts.map((d) => (
              <div key={d.name} className="ops-recline" style={{ background: d.status === 'Red' ? 'var(--bad-soft)' : 'var(--warn-soft)' }}>
                <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0, color: d.status === 'Red' ? 'var(--bad)' : 'var(--warn)' }} aria-hidden="true" />
                <div style={{ fontSize: 12.5 }}>
                  <strong>{d.name}</strong> — {d.status === 'Red' ? 'Performance Attention (capacity pressure)' : 'Performance Attention'}:
                  {' '}{d.breachRate}% breach rate vs {kpi.breachRate}% overall baseline, utilization index {d.utilization}
                </div>
              </div>
            ))}
          </div>

          <div className="ops-card-title" style={{ marginBottom: 8 }}>Peak-demand alerts</div>
          <div className="ops-card">
            {peak.peakHours.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>No hour currently exceeds the dynamic peak threshold ({peak.threshold}).</div>
            ) : peak.peakHours.map((h) => {
              const hr = hourly.find((x) => x.hour === h);
              return (
                <div key={h} className="ops-recline" style={{ background: 'var(--bad-soft)' }}>
                  <TrendingUp size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--bad)' }} aria-hidden="true" />
                  <div style={{ fontSize: 12.5 }}><strong>{h}:00</strong> — {hr.count} patients, exceeding the threshold of {peak.threshold} (mean {peak.mean} + 1 std {peak.std})</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'report' && (
        daily.length === 0 ? <EmptyState text="No data in the current filter range." /> : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead><tr><th>Date</th><th>Total patients</th><th>Avg wait</th><th>Median wait</th><th>Max wait</th><th>Breach rate</th><th>Alerts</th></tr></thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date}>
                    <td className="ops-mono">{d.date}</td>
                    <td className="ops-mono">{d.total}</td>
                    <td className="ops-mono">{fmtMin(d.avgWait)}</td>
                    <td className="ops-mono">{fmtMin(d.medianWait)}</td>
                    <td className="ops-mono">{fmtMin(d.maxWait)}</td>
                    <td className="ops-mono">{d.breachRate != null ? `${d.breachRate}%` : '—'}</td>
                    <td className="ops-mono">{d.alertCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

export default ReportsAlertsScreen;

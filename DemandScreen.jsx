import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { DEPT_NAMES, PRIORITY_NAMES } from '../../data/patientsData.js';
import { computeHourly, computePeak, computeShift, computeDayType, fmtMin } from '../../utils/calculations.js';

/* ============================================================
   SCREEN 4 — DEMAND, PEAK HOURS & CAPACITY
   ============================================================ */
function DemandScreen({ list }) {
  const hourly = useMemo(() => computeHourly(list), [list]);
  const peak = useMemo(() => computePeak(hourly), [hourly]);
  const shift = useMemo(() => computeShift(list), [list]);
  const dayType = useMemo(() => computeDayType(list), [list]);

  const deptPriorityTable = useMemo(() => {
    return DEPT_NAMES.map((d) => {
      const row = { department: d };
      PRIORITY_NAMES.forEach((p) => {
        row[p] = list.filter((pt) => pt.department === d && pt.priority === p).length;
      });
      row.total = list.filter((pt) => pt.department === d).length;
      return row;
    });
  }, [list]);

  return (
    <div>
      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div className="ops-card-title">Patient arrivals by hour of day</div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={hourly} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === 'count' ? [`${v} patients`, 'Volume'] : [`${v} min`, 'Avg wait']} />
            <ReferenceLine y={peak.threshold} stroke="var(--bad)" strokeDasharray="4 3" label={{ value: `Peak threshold (${peak.threshold})`, fontSize: 10, fill: 'var(--bad)', position: 'insideTopRight' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {hourly.map((h, i) => <Cell key={i} fill={peak.peakHours.includes(h.hour) ? 'var(--bad)' : 'var(--accent)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 8 }}>
          Peak threshold calculated dynamically from the current data as mean ({peak.mean}) + 1 standard deviation ({peak.std}).
        </div>
      </div>

      {peak.peakHours.length > 0 && (
        <div className="ops-recline" style={{ background: 'var(--bad-soft)', marginBottom: 18 }}>
          <TrendingUp size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--bad)' }} aria-hidden="true" />
          <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            Peak demand is concentrated during {peak.peakHours.map((h) => `${h}:00`).join(', ')}.
            Consider reviewing consultation capacity during {peak.peakHours.length > 1 ? 'these periods' : 'this period'}.
          </div>
        </div>
      )}

      <div className="ops-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
        <div className="ops-card">
          <div className="ops-card-title">By shift</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={shift} margin={{ top: 5, right: 10, left: -18, bottom: 5 }}>
              <XAxis dataKey="shift" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--steel)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
            Morning 8am–1pm · Afternoon 1pm–6pm · Evening 6pm–8pm (single day-shift facility, no overnight OPD)
          </div>
        </div>
        <div className="ops-card">
          <div className="ops-card-title">Weekday vs weekend</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {dayType.map((d) => (
              <div key={d.dayType} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>{d.dayType}</div>
                <div className="ops-mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{d.count}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>avg {fmtMin(d.avgWait)} wait</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ops-card-title" style={{ marginBottom: 8 }}>Volume by department and priority</div>
      <div className="ops-table-wrap" style={{ marginBottom: 18 }}>
        <table className="ops-table">
          <thead><tr><th>Department</th><th>Emergency</th><th>Urgent</th><th>Routine</th><th>Total</th></tr></thead>
          <tbody>
            {deptPriorityTable.map((r) => (
              <tr key={r.department}>
                <td style={{ fontWeight: 600 }}>{r.department}</td>
                <td className="ops-mono">{r.Emergency}</td>
                <td className="ops-mono">{r.Urgent}</td>
                <td className="ops-mono">{r.Routine}</td>
                <td className="ops-mono">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ops-card">
        <div className="ops-card-title">Historical average demand estimate</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10 }}>
          A simple historical average, not a predictive or machine-learning forecast — useful only as a staffing
          reference based on the last {list.length ? new Set(list.map(p=>p.m.dateKey)).size : 0} days of data in the current filter.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {shift.map((s) => (
            <div key={s.shift} style={{ fontSize: 12 }}>
              <span className="ops-mono" style={{ fontWeight: 600 }}>{Math.round(s.count / Math.max(1, new Set(list.map(p=>p.m.dateKey)).size))}</span> patients/day expected in the {s.shift.toLowerCase()} shift
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DemandScreen;

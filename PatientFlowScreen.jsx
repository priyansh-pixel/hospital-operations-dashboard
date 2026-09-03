import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info } from 'lucide-react';
import { fmtMin, mean, round1 } from '../../utils/calculations.js';
import { KpiCard } from '../Shared.jsx';

/* ============================================================
   SCREEN 2 — PATIENT FLOW ANALYSIS
   ============================================================ */
function PatientFlowScreen({ list }) {
  const completed = list.filter((p) => p.status === 'Completed');
  const withTriage = list.filter((p) => p.m.waitToTriage != null);
  const withConsult = list.filter((p) => p.m.waitToConsult != null);
  const withDiag = list.filter((p) => p.m.diagWait != null);

  const avgWaitToTriage = round1(mean(list.map((p) => p.m.waitToTriage)));
  const avgWaitToConsult = round1(mean(list.map((p) => p.m.waitToConsult)));
  const avgTriageToConsult = round1(mean(withConsult.filter(p=>p.m.waitToTriage!=null).map((p) => p.m.waitToConsult - p.m.waitToTriage)));
  const avgConsultDuration = round1(mean(list.map((p) => p.m.consultDuration)));
  const avgDiagWait = round1(mean(list.map((p) => p.m.diagWait)));
  const avgDiagDuration = round1(mean(list.map((p) => p.m.diagDuration)));
  const avgTotalTime = round1(mean(completed.map((p) => p.m.totalTime)));

  const diagShare = completed.length ? round1((withDiag.filter(p=>completed.includes(p)).length / completed.length) * 100) : null;

  const dischargeBuffer = round1(mean(completed.map((p) => {
    const lastClinical = p.diagEnd != null ? p.diagEnd : p.consultEnd;
    return p.discharge != null && lastClinical != null ? p.discharge - lastClinical : null;
  })));

  const stageData = [
    { name: 'Avg journey', 'Wait to triage': avgWaitToTriage || 0, 'Triage to consult wait': (avgTriageToConsult || 0), 'Consultation (service)': avgConsultDuration || 0, 'Diagnostics wait': (diagShare ? round1((avgDiagWait || 0) * diagShare / 100) : 0), 'Diagnostics (service)': (diagShare ? round1((avgDiagDuration || 0) * diagShare / 100) : 0), 'Discharge processing': dischargeBuffer || 0 },
  ];
  const segColors = { 'Wait to triage': '#B4750F', 'Triage to consult wait': '#D99A2B', 'Consultation (service)': '#0F6E7A', 'Diagnostics wait': '#D99A2B', 'Diagnostics (service)': '#3D5A73', 'Discharge processing': '#9AA7AD' };

  return (
    <div>
      <div className="ops-info-box" style={{ marginBottom: 18 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <div><strong>Waiting time</strong> (queueing, idle) is shown in amber tones below; <strong>service time</strong>
          (active care) in blue/steel; <strong>discharge processing</strong> in gray. These are distinct operational
          levers — a long total time in system can come from queueing delay, service duration, or administrative
          processing, and the fix for each is different.</div>
      </div>

      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div className="ops-card-title">Average patient journey (minutes) — Arrival → Triage → Consultation → Diagnostics → Discharge</div>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={stageData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={0} />
            <Tooltip formatter={(v) => `${v} min`} />
            {Object.keys(segColors).map((k) => (
              <Bar key={k} dataKey={k} stackId="a" fill={segColors[k]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 11 }}>
          {Object.keys(segColors).map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: segColors[k], display: 'inline-block' }} />{k}
            </div>
          ))}
        </div>
      </div>

      <div className="ops-grid ops-kpi-grid" style={{ marginBottom: 18 }}>
        <KpiCard label="Avg wait to triage" value={fmtMin(avgWaitToTriage)} sub={`n=${withTriage.length} triaged`} />
        <KpiCard label="Avg wait to consult" value={fmtMin(avgWaitToConsult)} sub={`n=${withConsult.length} consulted`} />
        <KpiCard label="Avg consultation duration" value={fmtMin(avgConsultDuration)} sub="service time, not waiting" />
        <KpiCard label="Avg diagnostics wait" value={fmtMin(avgDiagWait)} sub={`${diagShare != null ? diagShare + '%' : '—'} of completed visits had diagnostics`} />
        <KpiCard label="Avg total time in system" value={fmtMin(avgTotalTime)} sub={`n=${completed.length} completed visits`} />
      </div>

      <div className="ops-card-title" style={{ marginBottom: 8 }}>Patients reaching each stage</div>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead><tr><th>Stage</th><th>Patients reached</th><th>% of total</th></tr></thead>
          <tbody>
            <tr><td>Arrival</td><td className="ops-mono">{list.length}</td><td className="ops-mono">100%</td></tr>
            <tr><td>Triage</td><td className="ops-mono">{withTriage.length}</td><td className="ops-mono">{round1(withTriage.length / list.length * 100)}%</td></tr>
            <tr><td>Consultation</td><td className="ops-mono">{withConsult.length}</td><td className="ops-mono">{round1(withConsult.length / list.length * 100)}%</td></tr>
            <tr><td>Diagnostics</td><td className="ops-mono">{withDiag.length}</td><td className="ops-mono">{round1(withDiag.length / list.length * 100)}%</td></tr>
            <tr><td>Discharge (completed)</td><td className="ops-mono">{completed.length}</td><td className="ops-mono">{round1(completed.length / list.length * 100)}%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PatientFlowScreen;

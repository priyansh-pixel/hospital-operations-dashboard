import React from 'react';
import {
  LayoutDashboard, Activity, Building2, TrendingUp, Users, FileBarChart,
  X, AlertTriangle, Info, Menu, Filter, ArrowUpRight, ArrowDownRight, Clock, Gauge, ListOrdered,
} from 'lucide-react';
import { DEPT_NAMES, PRIORITY_NAMES, STATUS_NAMES } from '../data/patientsData.js';
import { fmtDateTime } from '../utils/calculations.js';


/* ============================================================
   SMALL SHARED COMPONENTS
   ============================================================ */
function StatusBadge({ status }) {
  const map = { Green: ['ops-badge-good', 'Within target'], Amber: ['ops-badge-warn', 'Needs attention'], Red: ['ops-badge-bad', 'Capacity pressure'] };
  const [cls, label] = map[status] || ['ops-badge-neutral', status];
  return <span className={`ops-badge ${cls}`}>{label}</span>;
}
function AlertBadge({ flag }) {
  if (flag == null) return <span className="ops-badge ops-badge-neutral">In progress</span>;
  return flag === 'ALERT'
    ? <span className="ops-badge ops-badge-bad">Breach</span>
    : <span className="ops-badge ops-badge-good">On target</span>;
}
function StatusPill({ status }) {
  const map = { Waiting: 'ops-badge-warn', 'In Consultation': 'ops-badge-neutral', Completed: 'ops-badge-good' };
  return <span className={`ops-badge ${map[status] || 'ops-badge-neutral'}`}>{status}</span>;
}

function KpiCard({ label, value, sub, icon, live }) {
  return (
    <div className="ops-card ops-kpi">
      <div className="ops-kpi-label">
        {live && <span className="ops-pulse-dot" aria-hidden="true" />}
        {icon}{label}
      </div>
      <div className="ops-kpi-value">{value}</div>
      {sub && <div className="ops-kpi-sub">{sub}</div>}
    </div>
  );
}

function VarianceTag({ v }) {
  if (v == null) return <span className="ops-mono">—</span>;
  const good = v <= 0;
  const Icon = good ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="ops-mono" style={{ color: good ? 'var(--good)' : 'var(--bad)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <Icon size={12} />{v > 0 ? '+' : ''}{v}m
    </span>
  );
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'flow', label: 'Patient Flow', icon: Activity },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'demand', label: 'Demand & Capacity', icon: TrendingUp },
  { key: 'records', label: 'Patient Records', icon: Users },
  { key: 'reports', label: 'Reports & Alerts', icon: FileBarChart },
  { key: 'forecast', label: 'Forecast & OPD Planner', icon: Gauge },
  { key: 'triage', label: 'Triage / Priority Queue', icon: ListOrdered },
];

function Sidebar({ page, setPage, open, setOpen }) {
  return (
    <nav className={`ops-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="ops-sidebar-brand">
        <Activity size={20} color="#5FBFC9" aria-hidden="true" />
        <div>
          <div className="ops-sidebar-brand-title">Patient Flow & Waiting-Time<br />Optimization</div>
          <div className="ops-sidebar-brand-sub">Operations Decision Support</div>
        </div>
      </div>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            className={`ops-nav-item${page === item.key ? ' active' : ''}`}
            onClick={() => { setPage(item.key); setOpen(false); }}
            aria-current={page === item.key ? 'page' : undefined}
          >
            <Icon size={16} aria-hidden="true" />{item.label}
          </button>
        );
      })}
      <div className="ops-nav-footer">
        <div style={{ fontSize: 10.5, color: '#7C8D95', padding: '0 10px 6px' }}>
          MBA Operations Management project<br />Synthetic academic dataset
        </div>
      </div>
    </nav>
  );
}

function FilterBar({ filters, setFilters, onReset }) {
  return (
    <div className="ops-filterbar">
      <Filter size={14} color="var(--ink-soft)" aria-hidden="true" />
      <select className="ops-select" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} aria-label="Filter by department">
        <option value="All">All departments</option>
        {DEPT_NAMES.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="ops-select" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} aria-label="Filter by priority">
        <option value="All">All priorities</option>
        {PRIORITY_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select className="ops-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status">
        <option value="All">All statuses</option>
        {STATUS_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="date" className="ops-date" value={filters.dateFrom || ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || null })} aria-label="From date" />
      <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>–</span>
      <input type="date" className="ops-date" value={filters.dateTo || ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || null })} aria-label="To date" />
      {(filters.department !== 'All' || filters.priority !== 'All' || filters.status !== 'All' || filters.dateFrom || filters.dateTo) && (
        <button className="ops-btn ops-btn-ghost ops-btn-sm" onClick={onReset}><X size={12} />Clear</button>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="ops-empty">
      <AlertTriangle size={26} aria-hidden="true" />
      <div>{text}</div>
    </div>
  );
}

function InfoPanel({ onClose }) {
  return (
    <div className="ops-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="About this dashboard">
      <div className="ops-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="ops-modal-header">
          <div className="ops-page-title" style={{ fontSize: 16 }}>About this dashboard</div>
          <button className="ops-btn ops-btn-ghost ops-btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.65 }}>
          <p style={{ marginTop: 0 }}>
            This is an <strong>Operations Management decision-support application</strong> built for an MBA
            academic project — it is not a hospital clinical system and makes no clinical claims.
          </p>
          <ul style={{ paddingLeft: 18, margin: '10px 0' }}>
            <li>Synthetic academic dataset: 1,573 outpatient visits</li>
            <li>55-day observation period across 4 outpatient departments</li>
            <li>Primary KPI: <strong>Wait to Consultation</strong> (Arrival → Consultation Start)</li>
            <li>Department-level waiting-time targets are illustrative operational assumptions for this
              simulation, not clinical or regulatory standards</li>
            <li>Live elapsed timers for in-progress patients are anchored to a fixed point in the historical
              dataset (not the real-world clock), since this is a static academic snapshot</li>
          </ul>
          <p><strong>Operations Management concepts demonstrated:</strong> Service Operations Management,
            Queuing Management, Capacity Planning, Process Analysis, Performance Measurement, and
            Demand/Peak-Period Analysis.</p>
          <p style={{ marginBottom: 0 }}>All KPIs, charts, and recommendations are calculated live from the
            underlying patient records — nothing is hardcoded. Recommendations are rule-based and traceable
            to the metrics shown; the application does not claim to mathematically optimize staffing.</p>
        </div>
      </div>
    </div>
  );
}

function ElapsedTime({ sinceMin, nowMin }) {
  const elapsed = Math.max(0, Math.round(nowMin - sinceMin));
  const h = Math.floor(elapsed / 60), m = elapsed % 60;
  return <span className="ops-mono">{h > 0 ? `${h}h ` : ''}{m}m</span>;
}

function CurrentlyActivePanel({ list, simulatedNowMin }) {
  const active = list.filter((p) => p.status === 'Waiting' || p.status === 'In Consultation');
  if (active.length === 0) return null;
  return (
    <div className="ops-card" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div className="ops-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span className="ops-pulse-dot" aria-hidden="true" /> Currently active patients
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--ink-soft)', fontWeight: 600 }}>
          <Clock size={11} aria-hidden="true" />Simulated operational clock
        </div>
      </div>
      <div className="ops-table-wrap" style={{ border: 'none' }}>
        <table className="ops-table">
          <thead><tr><th>Patient</th><th>Department</th><th>Priority</th><th>Status</th><th>Arrival</th><th>Elapsed*</th></tr></thead>
          <tbody>
            {active.map((p) => (
              <tr key={p.id}>
                <td>{p.name} <span className="ops-mono" style={{ color: 'var(--ink-soft)' }}>{p.id}</span></td>
                <td>{p.department}</td>
                <td>{p.priority}</td>
                <td><StatusPill status={p.status} /></td>
                <td className="ops-mono">{fmtDateTime(p.arrival)}</td>
                <td><ElapsedTime sinceMin={p.status === 'In Consultation' ? p.consultStart : p.arrival} nowMin={simulatedNowMin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 8 }}>
        *Elapsed time is a simulated demo timer anchored to a fixed point in this historical dataset, not your
        device's real-world clock — it does not alter any stored timestamp or analytical calculation.
      </div>
    </div>
  );
}


export {
  StatusBadge, AlertBadge, StatusPill, KpiCard, VarianceTag, NAV_ITEMS, Sidebar,
  FilterBar, EmptyState, InfoPanel, ElapsedTime, CurrentlyActivePanel,
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Menu, Info } from 'lucide-react';
import './App.css';

import { PATIENTS_COMPACT, SIMULATED_NOW_MIN } from './data/patientsData.js';
import { decodeRow, enrich, minutesToDate } from './utils/calculations.js';
import { Sidebar, FilterBar, InfoPanel } from './components/Shared.jsx';
import { PatientFormModal, ConfirmDialog } from './components/PatientFormModal.jsx';
import DashboardScreen from './components/screens/DashboardScreen.jsx';
import PatientFlowScreen from './components/screens/PatientFlowScreen.jsx';
import DepartmentsScreen from './components/screens/DepartmentsScreen.jsx';
import DemandScreen from './components/screens/DemandScreen.jsx';
import PatientRecordsScreen from './components/screens/PatientRecordsScreen.jsx';
import ReportsAlertsScreen from './components/screens/ReportsAlertsScreen.jsx';
import ForecastPlannerScreen from './components/screens/ForecastPlannerScreen.jsx';
import TriageScreen from './components/screens/TriageScreen.jsx';


/* ============================================================
   PAGE META
   ============================================================ */
const PAGE_META = {
  dashboard: { title: 'Executive Operations Dashboard', sub: 'Operational KPIs, department performance, and manager\u2019s attention' },
  flow: { title: 'Patient Flow Analysis', sub: 'Arrival \u2192 Triage \u2192 Consultation \u2192 Diagnostics \u2192 Discharge' },
  departments: { title: 'Department & Bottleneck Analysis', sub: 'Capacity, utilization, and target performance by department' },
  demand: { title: 'Demand, Peak Hours & Capacity', sub: 'Arrival patterns and data-driven peak-demand detection' },
  records: { title: 'Patient Records', sub: 'Add, edit, delete, and browse individual patient records' },
  reports: { title: 'Reports & Alerts', sub: 'Rule-based alerts and the daily operations report' },
  forecast: { title: 'Forecast & OPD Planner', sub: 'Next-day Emergency demand estimate and OPD capacity decision support' },
  triage: { title: 'Triage / Priority Queue', sub: 'Existing patients organized by priority, then by arrival time' },
};

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
  const [patients, setPatients] = useState(() => PATIENTS_COMPACT.map(decodeRow));
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [filters, setFilters] = useState({ department: 'All', priority: 'All', status: 'All', dateFrom: null, dateTo: null });
  const [modal, setModal] = useState(null); // { mode: 'add'|'edit', patient? }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [, setTick] = useState(0);

  const mountTimeRef = useRef(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const simulatedNowMin = SIMULATED_NOW_MIN + (Date.now() - mountTimeRef.current) / 60000;

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (filters.department !== 'All' && p.department !== filters.department) return false;
      if (filters.priority !== 'All' && p.priority !== filters.priority) return false;
      if (filters.status !== 'All' && p.status !== filters.status) return false;
      if ((filters.dateFrom || filters.dateTo) && p.arrival != null) {
        const d = minutesToDate(p.arrival);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (filters.dateFrom && key < filters.dateFrom) return false;
        if (filters.dateTo && key > filters.dateTo) return false;
      }
      return true;
    });
  }, [patients, filters]);

  const enrichedFiltered = useMemo(() => enrich(filteredPatients), [filteredPatients]);
  const enrichedAll = useMemo(() => enrich(patients), [patients]);

  function resetFilters() {
    setFilters({ department: 'All', priority: 'All', status: 'All', dateFrom: null, dateTo: null });
  }

  function handleAddSave(form) {
    const nextIdNum = Math.max(1573, ...patients.map((p) => p.idNum)) + 1;
    const newPatient = {
      id: `PT-${String(nextIdNum).padStart(4, '0')}`, idNum: nextIdNum,
      name: form.name.trim(), department: form.department, priority: form.priority, status: form.status,
      arrival: form.arrival, triage: form.triage, consultStart: form.consultStart, consultEnd: form.consultEnd,
      diagStart: form.diagStart, diagEnd: form.diagEnd, discharge: form.discharge, isSeed: false,
    };
    setPatients((prev) => [...prev, newPatient]);
    setModal(null);
  }
  function handleEditSave(form) {
    setPatients((prev) => prev.map((p) => p.id === modal.patient.id ? { ...p, ...form, name: form.name.trim() } : p));
    setModal(null);
  }
  function handleDelete() {
    setPatients((prev) => prev.filter((p) => p.id !== confirmDelete.id));
    setConfirmDelete(null);
  }
  function handleReset() {
    setPatients(PATIENTS_COMPACT.map(decodeRow));
    setConfirmReset(false);
  }

  const meta = PAGE_META[page];

  return (
    <div className="ops-app">
      <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="ops-main">
        <div className="ops-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="ops-btn ops-btn-ghost ops-mobile-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle navigation"><Menu size={18} /></button>
            <div>
              <div className="ops-page-title">{meta.title}</div>
              <div className="ops-page-sub">{meta.sub}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <FilterBar filters={filters} setFilters={setFilters} onReset={resetFilters} />
            <button className="ops-btn ops-btn-ghost ops-btn-sm" onClick={() => setShowInfo(true)}><Info size={13} />About</button>
          </div>
        </div>

        <div className="ops-content">
          {page === 'dashboard' && <DashboardScreen list={enrichedFiltered} allList={patients} simulatedNowMin={simulatedNowMin} />}
          {page === 'flow' && <PatientFlowScreen list={enrichedFiltered} />}
          {page === 'departments' && <DepartmentsScreen list={enrichedFiltered} />}
          {page === 'demand' && <DemandScreen list={enrichedFiltered} />}
          {page === 'records' && (
            <PatientRecordsScreen
              list={enrichedFiltered}
              simulatedNowMin={simulatedNowMin}
              onAddClick={() => setModal({ mode: 'add' })}
              onEditClick={(p) => setModal({ mode: 'edit', patient: p })}
              onDeleteClick={(p) => setConfirmDelete(p)}
              onResetClick={() => setConfirmReset(true)}
            />
          )}
          {page === 'reports' && <ReportsAlertsScreen list={enrichedFiltered} />}
          {page === 'forecast' && <ForecastPlannerScreen allList={patients} />}
          {page === 'triage' && <TriageScreen list={enrichedFiltered} simulatedNowMin={simulatedNowMin} />}
        </div>
      </div>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 80 }} />}
      {showInfo && <InfoPanel onClose={() => setShowInfo(false)} />}
      {modal && (
        <PatientFormModal
          mode={modal.mode} patient={modal.patient} simulatedNowMin={simulatedNowMin}
          onCancel={() => setModal(null)}
          onSave={modal.mode === 'add' ? handleAddSave : handleEditSave}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete patient record?"
          message={`This will permanently remove ${confirmDelete.name} (${confirmDelete.id}) from the current session's dataset. This cannot be undone, though you can restore the full original dataset at any time from Patient Records.`}
          confirmLabel="Delete" danger
          onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmReset && (
        <ConfirmDialog
          title="Reset to original dataset?"
          message="This will discard any patients you've added, edited, or deleted in this session and restore the original 1,573-record approved dataset."
          confirmLabel="Reset"
          onConfirm={handleReset} onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

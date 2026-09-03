import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { DEPT_NAMES, PRIORITY_NAMES, STATUS_NAMES } from '../data/patientsData.js';
import { toInputValue, fromInputValue, validatePatient, REQUIRED_BY_STATUS, FORBIDDEN_BY_STATUS } from '../utils/calculations.js';


/* ============================================================
   ADD / EDIT PATIENT MODAL
   ============================================================ */
function DateField({ label, value, onChange, disabled, error, required }) {
  return (
    <div className="ops-field">
      <label>{label}{required && !disabled ? ' *' : ''}</label>
      <input
        type="datetime-local"
        value={toInputValue(value)}
        disabled={disabled}
        onChange={(e) => onChange(fromInputValue(e.target.value))}
        className={error ? 'ops-error' : ''}
        style={disabled ? { background: 'var(--bg)', color: 'var(--ink-soft)' } : undefined}
      />
      {error && <div className="ops-field-error">{error}</div>}
    </div>
  );
}

function PatientFormModal({ mode, patient, onSave, onCancel, simulatedNowMin }) {
  const [form, setForm] = useState(() => {
    if (mode === 'edit' && patient) {
      const { name, department, priority, status, arrival, triage, consultStart, consultEnd, diagStart, diagEnd, discharge } = patient;
      return { name, department, priority, status, arrival, triage, consultStart, consultEnd, diagStart, diagEnd, discharge };
    }
    return {
      name: '', department: '', priority: '', status: 'Waiting',
      arrival: Math.round(simulatedNowMin), triage: null, consultStart: null,
      consultEnd: null, diagStart: null, diagEnd: null, discharge: null,
    };
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function setStatus(newStatus) {
    setForm((f) => {
      const next = { ...f, status: newStatus };
      (FORBIDDEN_BY_STATUS[newStatus] || []).forEach((field) => { next[field] = null; });
      return next;
    });
    setErrors({});
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validatePatient(form, [], mode === 'edit' ? patient.id : null);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  }

  const forbidden = FORBIDDEN_BY_STATUS[form.status] || [];
  const required = REQUIRED_BY_STATUS[form.status] || [];

  return (
    <div className="ops-modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-label={mode === 'add' ? 'Add patient' : 'Edit patient'}>
      <div className="ops-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ops-modal-header">
          <div className="ops-page-title" style={{ fontSize: 16 }}>{mode === 'add' ? 'Add patient' : `Edit ${patient.id}`}</div>
          <button className="ops-btn ops-btn-ghost ops-btn-sm" onClick={onCancel} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="ops-field">
            <label>Patient name *</label>
            <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} className={errors.name ? 'ops-error' : ''} />
            {errors.name && <div className="ops-field-error">{errors.name}</div>}
          </div>
          <div className="ops-field-row">
            <div className="ops-field">
              <label>Department *</label>
              <select value={form.department} onChange={(e) => setField('department', e.target.value)} className={errors.department ? 'ops-error' : ''}>
                <option value="">Select…</option>
                {DEPT_NAMES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <div className="ops-field-error">{errors.department}</div>}
            </div>
            <div className="ops-field">
              <label>Priority *</label>
              <select value={form.priority} onChange={(e) => setField('priority', e.target.value)} className={errors.priority ? 'ops-error' : ''}>
                <option value="">Select…</option>
                {PRIORITY_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.priority && <div className="ops-field-error">{errors.priority}</div>}
            </div>
          </div>
          <div className="ops-field">
            <label>Status *</label>
            <select value={form.status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="ops-field-row">
            <DateField label="Arrival time" value={form.arrival} onChange={(v) => setField('arrival', v)} required={required.includes('arrival')} error={errors.arrival} />
            <DateField label="Triage time" value={form.triage} onChange={(v) => setField('triage', v)} disabled={forbidden.includes('triage')} required={required.includes('triage')} error={errors.triage} />
          </div>
          <div className="ops-field-row">
            <DateField label="Consultation start" value={form.consultStart} onChange={(v) => setField('consultStart', v)} disabled={forbidden.includes('consultStart')} required={required.includes('consultStart')} error={errors.consultStart} />
            <DateField label="Consultation end" value={form.consultEnd} onChange={(v) => setField('consultEnd', v)} disabled={forbidden.includes('consultEnd')} required={required.includes('consultEnd')} error={errors.consultEnd} />
          </div>
          <div className="ops-field-row">
            <DateField label="Diagnostics start" value={form.diagStart} onChange={(v) => setField('diagStart', v)} disabled={forbidden.includes('diagStart')} error={errors.diagStart} />
            <DateField label="Diagnostics end" value={form.diagEnd} onChange={(v) => setField('diagEnd', v)} disabled={forbidden.includes('diagEnd')} error={errors.diagEnd} />
          </div>
          <DateField label="Discharge time" value={form.discharge} onChange={(v) => setField('discharge', v)} disabled={forbidden.includes('discharge')} required={required.includes('discharge')} error={errors.discharge} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="ops-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="ops-btn ops-btn-primary"><Check size={14} />{mode === 'add' ? 'Add patient' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="ops-modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="ops-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="ops-modal-header"><div className="ops-page-title" style={{ fontSize: 16 }}>{title}</div></div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 18, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="ops-btn" onClick={onCancel}>Cancel</button>
          <button className={`ops-btn ${danger ? 'ops-btn-danger' : 'ops-btn-primary'}`} style={danger ? { borderColor: 'var(--bad)' } : undefined} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export { DateField, PatientFormModal, ConfirmDialog };

import { DEPT_NAMES, PRIORITY_NAMES, STATUS_NAMES, DEPARTMENTS, BASE_DATE, utilizationIndex } from '../data/patientsData.js';


/* ============================================================
   DECODE + FORMAT HELPERS
   ============================================================ */
function decodeRow(row) {
  const [idNum, name, deptIdx, prioIdx, statusIdx, arrival, triage, consultStart, consultEnd, diagStart, diagEnd, discharge] = row;
  const nz = (v) => (v === 0 ? null : v);
  return {
    id: `PT-${String(idNum).padStart(4, '0')}`,
    idNum,
    name,
    department: DEPT_NAMES[deptIdx],
    priority: PRIORITY_NAMES[prioIdx],
    status: STATUS_NAMES[statusIdx],
    arrival: nz(arrival),
    triage: nz(triage),
    consultStart: nz(consultStart),
    consultEnd: nz(consultEnd),
    diagStart: nz(diagStart),
    diagEnd: nz(diagEnd),
    discharge: nz(discharge),
    isSeed: true,
  };
}

function minutesToDate(min) {
  return new Date(BASE_DATE.getTime() + min * 60000);
}
function fmtDateTime(min) {
  if (min == null) return '—';
  const d = minutesToDate(min);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtDate(min) {
  if (min == null) return '—';
  const d = minutesToDate(min);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtMin(v) {
  if (v == null) return '—';
  return `${v} min`;
}
function toInputValue(min) {
  if (min == null) return '';
  const d = minutesToDate(min);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromInputValue(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - BASE_DATE.getTime()) / 60000);
}

/* ============================================================
   DERIVED METRICS — always computed from raw fields, never stored
   ============================================================ */
function getDept(name) {
  return DEPARTMENTS.find((d) => d.name === name) || DEPARTMENTS[0];
}

function computeDerived(p) {
  const dept = getDept(p.department);
  const target = dept.target;
  const waitToTriage = p.triage != null && p.arrival != null ? p.triage - p.arrival : null;
  const waitToConsult = p.consultStart != null && p.arrival != null ? p.consultStart - p.arrival : null;
  const consultDuration = p.consultEnd != null && p.consultStart != null ? p.consultEnd - p.consultStart : null;
  const diagWait = p.diagStart != null && p.consultEnd != null ? p.diagStart - p.consultEnd : null;
  const diagDuration = p.diagEnd != null && p.diagStart != null ? p.diagEnd - p.diagStart : null;
  const totalTime = p.discharge != null && p.arrival != null ? p.discharge - p.arrival : null;
  const alertFlag = waitToConsult != null ? (waitToConsult > target ? 'ALERT' : 'OK') : null;

  let hour = null, shift = null, dayType = null, dateKey = null;
  if (p.arrival != null) {
    const d = minutesToDate(p.arrival);
    hour = d.getHours();
    shift = hour < 13 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
    const dow = d.getDay();
    dayType = (dow === 0 || dow === 6) ? 'Weekend' : 'Weekday';
    dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return { dept, target, waitToTriage, waitToConsult, consultDuration, diagWait, diagDuration, totalTime, alertFlag, hour, shift, dayType, dateKey };
}

function enrich(patients) {
  return patients.map((p) => ({ ...p, m: computeDerived(p) }));
}

/* ============================================================
   STATS HELPERS
   ============================================================ */
function percentile(values, p) {
  const arr = values.filter((v) => v != null).slice().sort((a, b) => a - b);
  if (arr.length === 0) return null;
  const idx = (p / 100) * (arr.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}
function mean(values) {
  const arr = values.filter((v) => v != null);
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function round1(v) { return v == null ? null : Math.round(v * 10) / 10; }

/* ============================================================
   AGGREGATIONS
   ============================================================ */
function computeKPIs(list) {
  const waits = list.map((p) => p.m.waitToConsult);
  const withWait = waits.filter((v) => v != null);
  const breaches = list.filter((p) => p.m.alertFlag === 'ALERT').length;
  return {
    total: list.length,
    avgWait: round1(mean(waits)),
    medianWait: round1(percentile(waits, 50)),
    p90Wait: round1(percentile(waits, 90)),
    breachRate: withWait.length ? round1((breaches / withWait.length) * 100) : null,
    breachCount: breaches,
    consultedCount: withWait.length,
    currentlyWaiting: list.filter((p) => p.status === 'Waiting').length,
    currentlyInConsultation: list.filter((p) => p.status === 'In Consultation').length,
  };
}

function computeDeptPerformance(list) {
  const overall = computeKPIs(list);
  return DEPARTMENTS.map((dept) => {
    const sub = list.filter((p) => p.department === dept.name);
    const kpi = computeKPIs(sub);
    const util = utilizationIndex(dept);
    const variance = kpi.avgWait != null ? round1(kpi.avgWait - dept.target) : null;
    let status = 'Green';
    if (kpi.breachRate != null && overall.breachRate != null && kpi.breachRate > overall.breachRate) {
      status = util > 1.0 ? 'Red' : 'Amber';
    }
    return {
      name: dept.name, doctors: dept.doctors, serviceTime: dept.serviceTime,
      demandShare: dept.demandShare, target: dept.target, utilization: round1(util),
      count: kpi.total, avgWait: kpi.avgWait, medianWait: kpi.medianWait, p90Wait: kpi.p90Wait,
      variance, breachRate: kpi.breachRate, status,
    };
  });
}

function computeHourly(list) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);
  return hours.map((h) => {
    const sub = list.filter((p) => p.m.hour === h);
    const waits = sub.map((p) => p.m.waitToConsult);
    return { hour: h, label: `${h}:00`, count: sub.length, avgWait: round1(mean(waits)) };
  });
}

function computePeak(hourly) {
  const counts = hourly.map((h) => h.count);
  const m = mean(counts) || 0;
  const variance = counts.length ? counts.reduce((a, b) => a + (b - m) ** 2, 0) / counts.length : 0;
  const std = Math.sqrt(variance);
  const threshold = m + std;
  const peakHours = hourly.filter((h) => h.count > threshold).map((h) => h.hour);
  return { mean: round1(m), std: round1(std), threshold: round1(threshold), peakHours };
}

function computeShift(list) {
  return ['Morning', 'Afternoon', 'Evening'].map((s) => {
    const sub = list.filter((p) => p.m.shift === s);
    const waits = sub.map((p) => p.m.waitToConsult);
    return { shift: s, count: sub.length, avgWait: round1(mean(waits)) };
  });
}

function computeDayType(list) {
  return ['Weekday', 'Weekend'].map((s) => {
    const sub = list.filter((p) => p.m.dayType === s);
    const waits = sub.map((p) => p.m.waitToConsult);
    return { dayType: s, count: sub.length, avgWait: round1(mean(waits)) };
  });
}

function computeDailyReport(list) {
  const byDate = {};
  list.forEach((p) => {
    if (!p.m.dateKey) return;
    if (!byDate[p.m.dateKey]) byDate[p.m.dateKey] = [];
    byDate[p.m.dateKey].push(p);
  });
  return Object.keys(byDate).sort().map((date) => {
    const sub = byDate[date];
    const kpi = computeKPIs(sub);
    const maxWait = round1(Math.max(...sub.map((p) => p.m.waitToConsult).filter((v) => v != null), 0)) || null;
    return { date, total: kpi.total, avgWait: kpi.avgWait, medianWait: kpi.medianWait, maxWait, breachRate: kpi.breachRate, alertCount: kpi.breachCount };
  }).reverse();
}

function computeRecommendations(deptPerf, peakInfo, overallBreach) {
  const recs = [];
  const attention = deptPerf.filter((d) => d.status === 'Red').sort((a, b) => b.breachRate - a.breachRate);
  attention.forEach((d) => {
    recs.push({
      type: 'capacity',
      severity: 'bad',
      text: `${d.name} combines a ${d.breachRate}% target-breach rate with a utilization index of ${d.utilization}. High capacity pressure is associated with higher observed waiting time here. Consider reviewing consultation capacity during peak hours.`,
    });
  });
  const amber = deptPerf.filter((d) => d.status === 'Amber');
  amber.forEach((d) => {
    recs.push({
      type: 'attention',
      severity: 'warn',
      text: `${d.name}'s breach rate (${d.breachRate}%) exceeds the overall average (${overallBreach}%). Performance here warrants monitoring, though utilization does not currently indicate a structural capacity issue.`,
    });
  });
  if (peakInfo.peakHours.length) {
    const hrs = peakInfo.peakHours.map((h) => `${h}:00`).join(', ');
    recs.push({
      type: 'demand',
      severity: 'warn',
      text: `Peak demand is concentrated during ${hrs}, exceeding the mean hourly volume by more than one standard deviation. Consider reviewing consultation capacity during this period.`,
    });
  }
  const topUtil = deptPerf.slice().sort((a, b) => b.utilization - a.utilization)[0];
  const alreadyCovered = attention.some((d) => d.name === topUtil?.name);
  if (topUtil && topUtil.utilization > 1.0 && !alreadyCovered) {
    recs.push({
      type: 'utilization',
      severity: 'neutral',
      text: `${topUtil.name} has the highest utilization index (${topUtil.utilization}) among departments, based on its demand share, service time, and doctor count.`,
    });
  }
  return recs;
}

/* ============================================================
   VALIDATION
   ============================================================ */
const REQUIRED_BY_STATUS = {
  Waiting: ['name', 'department', 'priority', 'arrival'],
  'In Consultation': ['name', 'department', 'priority', 'arrival', 'triage', 'consultStart'],
  Completed: ['name', 'department', 'priority', 'arrival', 'triage', 'consultStart', 'consultEnd', 'discharge'],
};
const FORBIDDEN_BY_STATUS = {
  Waiting: ['consultStart', 'consultEnd', 'diagStart', 'diagEnd', 'discharge'],
  'In Consultation': ['consultEnd', 'diagStart', 'diagEnd', 'discharge'],
  Completed: [],
};
const FIELD_LABELS = {
  name: 'Patient name', department: 'Department', priority: 'Priority', arrival: 'Arrival time',
  triage: 'Triage time', consultStart: 'Consultation start', consultEnd: 'Consultation end',
  diagStart: 'Diagnostics start', diagEnd: 'Diagnostics end', discharge: 'Discharge time',
};

function validatePatient(form, allPatients, editingId) {
  const errors = {};
  const status = form.status;
  const required = REQUIRED_BY_STATUS[status] || [];
  const forbidden = FORBIDDEN_BY_STATUS[status] || [];

  required.forEach((f) => {
    if (f === 'name' && !form.name.trim()) errors.name = `${FIELD_LABELS[f]} is required.`;
    if (f === 'department' && !form.department) errors.department = `${FIELD_LABELS[f]} is required.`;
    if (f === 'priority' && !form.priority) errors.priority = `${FIELD_LABELS[f]} is required.`;
    if (['arrival', 'triage', 'consultStart', 'consultEnd', 'discharge'].includes(f) && form[f] == null) {
      errors[f] = `${FIELD_LABELS[f]} is required when status is "${status}".`;
    }
  });
  forbidden.forEach((f) => {
    if (form[f] != null) {
      errors[f] = `${FIELD_LABELS[f]} should be empty while status is "${status}".`;
    }
  });
  // diagnostics must be paired
  if ((form.diagStart != null) !== (form.diagEnd != null)) {
    errors.diagStart = errors.diagStart || 'Diagnostics start and end must both be set, or both left empty.';
    errors.diagEnd = errors.diagEnd || 'Diagnostics start and end must both be set, or both left empty.';
  }

  const seq = [
    ['arrival', 'triage'], ['triage', 'consultStart'], ['arrival', 'consultStart'],
    ['consultStart', 'consultEnd'], ['consultEnd', 'diagStart'], ['diagStart', 'diagEnd'],
    ['consultEnd', 'discharge'], ['diagEnd', 'discharge'],
  ];
  seq.forEach(([a, b]) => {
    if (form[a] != null && form[b] != null && form[a] > form[b]) {
      const msg = `${FIELD_LABELS[b]} cannot be before ${FIELD_LABELS[a].toLowerCase()}.`;
      errors[b] = errors[b] || msg;
    }
  });

  if (!editingId) {
    // new records get an auto-assigned id, so no uniqueness input to check
  }

  return errors;
}

export {
  decodeRow, minutesToDate, fmtDateTime, fmtDate, fmtMin, toInputValue, fromInputValue,
  getDept, computeDerived, enrich, percentile, mean, round1,
  computeKPIs, computeDeptPerformance, computeHourly, computePeak, computeShift, computeDayType,
  computeDailyReport, computeRecommendations,
  REQUIRED_BY_STATUS, FORBIDDEN_BY_STATUS, FIELD_LABELS, validatePatient,
};

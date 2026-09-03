/* ============================================================
   EMERGENCY DEMAND FORECAST & OPD CAPACITY PLANNER
   New, additive module. Does not modify any existing formula,
   KPI definition, or calculation in calculations.js.
   Reads from the same verified patient dataset only.
   ============================================================ */
import { minutesToDate } from './calculations.js';

function dateKeyOf(minutes) {
  const d = minutesToDate(minutes);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Computes the next-day Emergency demand forecast from the FULL, unfiltered
 * patient dataset (never the globally-filtered list), using only patients
 * with status === 'Completed'. Historical-average method only, per the
 * approved feasibility study (no day-of-week weighting, no trend, no
 * regression, no ML) - none of those were supported by back-tested evidence.
 */
export function computeEmergencyForecast(allPatients) {
  const completed = allPatients.filter((p) => p.status === 'Completed' && p.arrival != null);
  if (completed.length === 0) {
    return null;
  }

  // Full calendar date span, so days with zero Emergency arrivals still count as a zero, not a gap
  const dateKeys = completed.map((p) => dateKeyOf(p.arrival));
  const sortedKeys = [...dateKeys].sort();
  const earliestKey = sortedKeys[0];
  const latestKey = sortedKeys[sortedKeys.length - 1];

  const earliestDate = new Date(earliestKey + 'T00:00:00');
  const latestDate = new Date(latestKey + 'T00:00:00');
  const dayList = [];
  for (let d = new Date(earliestDate); d <= latestDate; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayList.push(key);
  }

  const emergCompleted = completed.filter((p) => p.priority === 'Emergency');
  const countsByDay = {};
  dayList.forEach((k) => { countsByDay[k] = 0; });
  emergCompleted.forEach((p) => {
    const k = dateKeyOf(p.arrival);
    if (k in countsByDay) countsByDay[k] += 1;
  });

  const dailySeries = dayList.map((k) => ({ date: k, count: countsByDay[k] }));
  const counts = dailySeries.map((d) => d.count);
  const totalEmergency = counts.reduce((a, b) => a + b, 0);
  const historicalDays = dayList.length;
  const historicalAverage = totalEmergency / historicalDays;
  const forecastValue = Math.round(historicalAverage);
  const minDaily = Math.min(...counts);
  const maxDaily = Math.max(...counts);

  const forecastDateObj = new Date(latestDate);
  forecastDateObj.setDate(forecastDateObj.getDate() + 1);
  const forecastDateKey = `${forecastDateObj.getFullYear()}-${String(forecastDateObj.getMonth() + 1).padStart(2, '0')}-${String(forecastDateObj.getDate()).padStart(2, '0')}`;

  return {
    forecastDate: forecastDateKey,
    forecastValue,
    historicalAverage,
    historicalDays,
    totalEmergency,
    minDaily,
    maxDaily,
    dailySeries,
    latestHistoricalDate: latestKey,
  };
}

/**
 * Validates manager-entered capacity planning inputs.
 * Returns an errors object; empty object means valid.
 */
export function validateCapacityInputs(totalCapacityRaw, bufferPctRaw) {
  const errors = {};
  const totalCapacity = Number(totalCapacityRaw);
  const bufferPct = Number(bufferPctRaw);

  if (totalCapacityRaw === '' || totalCapacityRaw == null || Number.isNaN(totalCapacity)) {
    errors.totalCapacity = 'Enter a number for total daily consultation capacity.';
  } else if (totalCapacity <= 0) {
    errors.totalCapacity = 'Total daily consultation capacity must be a positive number.';
  }

  if (bufferPctRaw === '' || bufferPctRaw == null || Number.isNaN(bufferPct)) {
    errors.bufferPct = 'Enter a number for the Emergency capacity buffer.';
  } else if (bufferPct < 0 || bufferPct > 100) {
    errors.bufferPct = 'Emergency capacity buffer must be between 0% and 100%.';
  }

  return errors;
}

/**
 * Converts a forecast + manager assumptions into a capacity plan and a
 * transparent, rule-based recommended operational action. Three cases only,
 * exactly as specified - no AI-generated or arbitrary text.
 */
export function computeCapacityPlan(forecastValue, totalCapacity, bufferPct) {
  const buffer = forecastValue * (bufferPct / 100);
  const protectedEmergencyCapacity = Math.ceil(forecastValue + buffer);
  const rawPotentialOPD = totalCapacity - protectedEmergencyCapacity;
  const EPSILON = 1e-9;
  const displayPotentialOPD = Math.max(0, Math.floor(rawPotentialOPD + EPSILON));

  let caseNumber, actionType, recommendation, reason;

  if (rawPotentialOPD > EPSILON) {
    caseNumber = 1;
    actionType = 'OPD Capacity Available';
    recommendation = 'Maintain protected Emergency capacity and consider opening OPD appointment slots up to the indicated potential OPD capacity, subject to actual staffing, doctor availability, and operational judgment.';
    reason = 'Forecast Emergency demand can be accommodated within the stated consultation capacity and Emergency buffer.';
  } else if (Math.abs(rawPotentialOPD) <= EPSILON) {
    caseNumber = 2;
    actionType = 'Protect Emergency Capacity';
    recommendation = 'Prioritize Emergency capacity and avoid adding additional OPD appointments under the current planning assumptions.';
    reason = 'Forecast Emergency demand plus the selected buffer consumes the stated consultation capacity.';
  } else {
    caseNumber = 3;
    actionType = 'Capacity Risk';
    recommendation = 'Increase operational readiness for Emergency demand. Review staffing, consultation capacity, and appointment allocation before accepting additional OPD load.';
    reason = 'Protected Emergency capacity exceeds the stated total consultation capacity.';
  }

  const actionDetails = {
    1: [
      'Protect the forecast Emergency capacity.',
      'Consider releasing available capacity for OPD appointments.',
      'Confirm actual doctor/staff availability before opening slots.',
    ],
    2: [
      'Protect Emergency capacity first.',
      'Review OPD appointment allocation.',
      'Review staffing and consultation capacity.',
    ],
    3: [
      'Prepare additional Emergency operational capacity where feasible.',
      'Review staffing and doctor availability.',
      'Avoid increasing OPD load until capacity is reassessed.',
    ],
  }[caseNumber];

  return {
    buffer, protectedEmergencyCapacity, rawPotentialOPD, displayPotentialOPD,
    caseNumber, actionType, recommendation, reason, actionDetails,
    insufficientWarning: rawPotentialOPD < -EPSILON,
  };
}

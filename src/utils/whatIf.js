/* ============================================================
   WHAT-IF CAPACITY SIMULATOR
   New, additive module. Does NOT modify forecast.js, calculations.js,
   or patientsData.js in any way. Reuses computeCapacityPlan from the
   existing, verified forecast.js for all underlying math - this file
   only adds What-if-specific status labels and recommendation text.
   ============================================================ */
import { computeCapacityPlan } from './forecast.js';

// Status labels specific to the What-if scenario table (distinct wording
// from the single-scenario planner's actionType, as specified), but driven
// by the SAME caseNumber (1/2/3) the existing computeCapacityPlan already
// determines - no new case logic, only a different label per case.
const WHATIF_STATUS_LABEL = {
  1: 'OPD Capacity Available',
  2: 'Emergency Capacity Fully Protected',
  3: 'Insufficient Stated Capacity',
};

const WHATIF_RECOMMENDATION = {
  1: 'Potential OPD capacity is available under the current planning assumptions. Management may consider using these slots for OPD appointments, subject to doctor availability and other operational constraints.',
  2: 'Consultation capacity is fully consumed by the protected Emergency requirement under the current assumptions. Management should prioritize Emergency coverage.',
  3: 'The stated consultation capacity is insufficient to cover the protected Emergency requirement under the current assumptions. Management should review capacity, staffing or the Emergency protection assumption before committing additional OPD appointments.',
};

/**
 * Computes Low/Base/High scenarios by calling the existing, unmodified
 * computeCapacityPlan for each capacity value - same forecast, same buffer,
 * same rounding conventions as the single-scenario planner above it.
 */
export function computeWhatIfScenarios(forecastValue, bufferPct, lowCapacity, baseCapacity, highCapacity) {
  const build = (label, capacity) => {
    const plan = computeCapacityPlan(forecastValue, capacity, bufferPct);
    return {
      label, capacity,
      protectedEmergencyCapacity: plan.protectedEmergencyCapacity,
      potentialOPD: plan.displayPotentialOPD,
      rawPotentialOPD: plan.rawPotentialOPD,
      caseNumber: plan.caseNumber,
      statusLabel: WHATIF_STATUS_LABEL[plan.caseNumber],
    };
  };
  return {
    low: build('Low', lowCapacity),
    base: build('Base', baseCapacity),
    high: build('High', highCapacity),
  };
}

export function whatIfRecommendation(caseNumber) {
  return WHATIF_RECOMMENDATION[caseNumber];
}

/**
 * Dynamic comparison sentence between two scenarios (High vs Base by default).
 * Never hardcoded - the slot difference is computed from the two scenario objects.
 */
export function compareScenarios(scenarioA, scenarioB, labelA, labelB) {
  const diff = scenarioA.potentialOPD - scenarioB.potentialOPD;
  if (diff > 0) {
    return `Compared with the ${labelB} scenario, the ${labelA} scenario provides ${diff} additional potential OPD ${diff === 1 ? 'slot' : 'slots'} under the current Emergency forecast and buffer assumptions.`;
  } else if (diff < 0) {
    return `Compared with the ${labelB} scenario, the ${labelA} scenario provides ${Math.abs(diff)} fewer potential OPD ${Math.abs(diff) === 1 ? 'slot' : 'slots'} under the current Emergency forecast and buffer assumptions.`;
  }
  return `Compared with the ${labelB} scenario, the ${labelA} scenario provides the same potential OPD capacity under the current Emergency forecast and buffer assumptions.`;
}

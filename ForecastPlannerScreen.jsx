import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, Info, ChevronDown, ChevronRight, Calculator } from 'lucide-react';
import { computeEmergencyForecast, computeCapacityPlan, validateCapacityInputs } from '../../utils/forecast.js';
import { computeWhatIfScenarios, whatIfRecommendation, compareScenarios } from '../../utils/whatIf.js';

const OM_TAGS = ['Demand Forecasting', 'Capacity Planning', 'Scheduling', 'Service Operations', 'Waiting-Time Management', 'Decision Support'];

function DataTag() {
  return <span className="ops-badge ops-badge-neutral" title="Calculated directly from the verified patient dataset">Data-derived</span>;
}
function ManagerTag() {
  return <span className="ops-badge ops-badge-warn" title="An assumption you enter - not real hospital data">Manager-entered</span>;
}

export default function ForecastPlannerScreen({ allList }) {
  const forecast = useMemo(() => computeEmergencyForecast(allList), [allList]);

  const [totalCapacityInput, setTotalCapacityInput] = useState('20');
  const [bufferPctInput, setBufferPctInput] = useState('20');
  const [lowCapacityInput, setLowCapacityInput] = useState(() => String(Math.max(1, 20 - 5)));
  const [highCapacityInput, setHighCapacityInput] = useState(() => String(20 + 5));
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const errors = validateCapacityInputs(totalCapacityInput, bufferPctInput);
  const hasErrors = Object.keys(errors).length > 0;

  const plan = useMemo(() => {
    if (!forecast || hasErrors) return null;
    return computeCapacityPlan(forecast.forecastValue, Number(totalCapacityInput), Number(bufferPctInput));
  }, [forecast, hasErrors, totalCapacityInput, bufferPctInput]);

  const lowErrors = validateCapacityInputs(lowCapacityInput, bufferPctInput);
  const highErrors = validateCapacityInputs(highCapacityInput, bufferPctInput);
  const whatIfHasErrors = hasErrors || Object.keys(lowErrors).length > 0 || Object.keys(highErrors).length > 0;

  const whatIf = useMemo(() => {
    if (!forecast || whatIfHasErrors) return null;
    return computeWhatIfScenarios(
      forecast.forecastValue, Number(bufferPctInput),
      Number(lowCapacityInput), Number(totalCapacityInput), Number(highCapacityInput)
    );
  }, [forecast, whatIfHasErrors, bufferPctInput, lowCapacityInput, totalCapacityInput, highCapacityInput]);

  if (!forecast) {
    return (
      <div className="ops-empty">
        <AlertTriangle size={26} aria-hidden="true" />
        <div>No completed historical records are available to build a forecast from.</div>
      </div>
    );
  }

  const chartData = forecast.dailySeries.map((d) => ({ date: d.date.slice(5), count: d.count }));
  const caseBg = plan ? (plan.caseNumber === 1 ? 'var(--good-soft)' : plan.caseNumber === 2 ? 'var(--warn-soft)' : 'var(--bad-soft)') : 'var(--line-soft)';
  const caseColor = plan ? (plan.caseNumber === 1 ? 'var(--good)' : plan.caseNumber === 2 ? 'var(--warn)' : 'var(--bad)') : 'var(--ink-soft)';

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {OM_TAGS.map((t) => <span key={t} className="ops-badge ops-badge-neutral">{t}</span>)}
      </div>

      <div className="ops-info-box" style={{ marginBottom: 18 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <div>Forecast based on all completed historical Emergency arrivals — this is not affected
          by the department/priority/status filters used elsewhere in the app, so it always reflects
          overall hospital-wide Emergency demand.</div>
      </div>

      {/* SECTION A - Forecast */}
      <div className="ops-card-title" style={{ marginBottom: 8 }}>Next-Day Emergency Demand</div>
      <div className="ops-card" style={{ marginBottom: 18, borderColor: 'var(--accent)', borderWidth: 1.5 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div className="ops-kpi-label">Forecast date <DataTag /></div>
            <div className="ops-kpi-value" style={{ fontSize: 20 }}>{forecast.forecastDate}</div>
          </div>
          <div>
            <div className="ops-kpi-label">Forecast Emergency patients <DataTag /></div>
            <div className="ops-kpi-value" style={{ color: 'var(--accent)' }}>{forecast.forecastValue}</div>
            <div className="ops-kpi-sub">Historical average: {forecast.historicalAverage.toFixed(1)} patients/day</div>
          </div>
          <div>
            <div className="ops-kpi-label">Forecast method <DataTag /></div>
            <div className="ops-kpi-value" style={{ fontSize: 16 }}>Historical Average</div>
          </div>
          <div>
            <div className="ops-kpi-label">Historical days used <DataTag /></div>
            <div className="ops-kpi-value" style={{ fontSize: 20 }}>{forecast.historicalDays}</div>
          </div>
        </div>
      </div>

      <div className="ops-grid ops-kpi-grid" style={{ marginBottom: 18 }}>
        <KpiMini label="Avg Emergency/day" value={forecast.historicalAverage.toFixed(2)} />
        <KpiMini label="Minimum/day" value={forecast.minDaily} />
        <KpiMini label="Maximum/day" value={forecast.maxDaily} />
        <KpiMini label="Historical days" value={forecast.historicalDays} />
        <KpiMini label="Total Emergency arrivals" value={forecast.totalEmergency} />
      </div>

      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div className="ops-card-title">Historical Daily Emergency Arrivals</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9.5 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [`${v} patients`, 'Emergency arrivals']} />
            <ReferenceLine y={forecast.historicalAverage} stroke="var(--accent)" strokeDasharray="4 3"
              label={{ value: `Historical average (${forecast.historicalAverage.toFixed(1)})`, fontSize: 10, fill: 'var(--accent)', position: 'insideTopRight' }} />
            <Bar dataKey="count" fill="var(--steel)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 6 }}>
          This chart shows the historical basis for the forecast only \u2014 it is not a projection of future days.
        </div>
      </div>

      {/* SECTION B - Capacity Planner */}
      <div className="ops-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calculator size={15} aria-hidden="true" /> OPD Capacity Planner
      </div>
      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
          The dataset does not contain actual hospital consultation capacity. Enter your own planning
          assumptions below <ManagerTag />.
        </div>
        <div className="ops-field-row">
          <div className="ops-field">
            <label>Total Daily Consultation Capacity *</label>
            <input type="number" min="0" step="1" value={totalCapacityInput}
              onChange={(e) => setTotalCapacityInput(e.target.value)}
              className={errors.totalCapacity ? 'ops-error' : ''} />
            {errors.totalCapacity && <div className="ops-field-error">{errors.totalCapacity}</div>}
          </div>
          <div className="ops-field">
            <label>Emergency Capacity Buffer (%) *</label>
            <input type="number" min="0" max="100" step="1" value={bufferPctInput}
              onChange={(e) => setBufferPctInput(e.target.value)}
              className={errors.bufferPct ? 'ops-error' : ''} />
            {errors.bufferPct && <div className="ops-field-error">{errors.bufferPct}</div>}
          </div>
        </div>

        {plan && (
          <>
            <div className="ops-grid ops-kpi-grid" style={{ marginTop: 6, marginBottom: 4 }}>
              <KpiMini label="Emergency buffer" value={plan.buffer.toFixed(1)} />
              <KpiMini label="Protected Emergency capacity" value={plan.protectedEmergencyCapacity} />
              <KpiMini label="Potential OPD capacity" value={plan.displayPotentialOPD} highlight={plan.caseNumber} />
            </div>

            {plan.insufficientWarning && (
              <div className="ops-recline" style={{ background: 'var(--bad-soft)', marginTop: 10 }}>
                <AlertTriangle size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--bad)' }} aria-hidden="true" />
                <div style={{ fontSize: 12.5, color: 'var(--bad)' }}>
                  Insufficient stated capacity to cover forecast Emergency demand and the selected buffer.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recommended Operational Action */}
      {plan && (
        <>
          <div className="ops-card-title" style={{ marginBottom: 8 }}>Recommended Operational Action</div>
          <div className="ops-card" style={{ marginBottom: 18, background: caseBg }}>
            <div className="ops-badge" style={{ background: 'transparent', border: `1px solid ${caseColor}`, color: caseColor, marginBottom: 8 }}>
              {plan.actionType}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)', marginBottom: 6 }}>{plan.recommendation}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontStyle: 'italic' }}>{plan.reason}</div>

            <div style={{ marginTop: 12 }}>
              {plan.actionDetails.map((a, i) => (
                <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}>{i + 1}. {a}</div>
              ))}
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer' }}>
                Why this recommendation?
              </summary>
              <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.8, fontFamily: 'IBM Plex Mono, monospace' }}>
                Forecast Emergency demand: {forecast.forecastValue} patients<br />
                Emergency buffer: {bufferPctInput}%<br />
                Protected Emergency capacity: {plan.protectedEmergencyCapacity} patients<br />
                Total stated consultation capacity: {totalCapacityInput} patients<br />
                Potential OPD capacity: {plan.displayPotentialOPD} patients<br />
                <br />
                <span style={{ fontFamily: 'Inter, sans-serif', fontStyle: 'italic' }}>
                  {plan.displayPotentialOPD > 0
                    ? `${plan.displayPotentialOPD} potential OPD slots remain after protecting forecast Emergency capacity.`
                    : plan.caseNumber === 2
                    ? 'No OPD slots remain after protecting forecast Emergency capacity.'
                    : 'Stated capacity is short of protected Emergency capacity by ' + Math.abs(Math.round(plan.rawPotentialOPD)) + ' patients.'}
                </span>
              </div>
            </details>
          </div>
        </>
      )}

      {/* WHAT-IF CAPACITY SIMULATOR - scenario analysis only, reuses the forecast and buffer above */}
      <div className="ops-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calculator size={15} aria-hidden="true" /> What-If Capacity Simulator
      </div>
      <div className="ops-card" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
          Evaluates alternative total consultation capacity assumptions against the same forecast
          ({forecast.forecastValue} patients) and buffer ({bufferPctInput}%) used above. This is a
          scenario-analysis tool, not a staffing optimizer or a guarantee of appointment availability.
          Base uses the capacity you entered above; Low and High are editable scenario assumptions <ManagerTag />.
        </div>

        <div className="ops-field-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="ops-field">
            <label>Low</label>
            <input type="number" min="0" step="1" value={lowCapacityInput}
              onChange={(e) => setLowCapacityInput(e.target.value)}
              className={lowErrors.totalCapacity ? 'ops-error' : ''} />
            {lowErrors.totalCapacity && <div className="ops-field-error">{lowErrors.totalCapacity}</div>}
          </div>
          <div className="ops-field">
            <label>Base (from above)</label>
            <input type="number" value={totalCapacityInput} disabled style={{ background: 'var(--bg)', color: 'var(--ink-soft)' }} />
          </div>
          <div className="ops-field">
            <label>High</label>
            <input type="number" min="0" step="1" value={highCapacityInput}
              onChange={(e) => setHighCapacityInput(e.target.value)}
              className={highErrors.totalCapacity ? 'ops-error' : ''} />
            {highErrors.totalCapacity && <div className="ops-field-error">{highErrors.totalCapacity}</div>}
          </div>
        </div>

        {whatIf && (
          <>
            <div className="ops-table-wrap" style={{ marginTop: 6, marginBottom: 14 }}>
              <table className="ops-table">
                <thead>
                  <tr><th>Scenario</th><th>Total Capacity</th><th>Protected Emergency</th><th>Potential OPD</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {[whatIf.low, whatIf.base, whatIf.high].map((s) => (
                    <tr key={s.label} style={s.label === 'Base' ? { background: 'var(--accent-soft)' } : undefined}>
                      <td style={{ fontWeight: 600 }}>{s.label}</td>
                      <td className="ops-mono">{s.capacity}</td>
                      <td className="ops-mono">{s.protectedEmergencyCapacity}</td>
                      <td className="ops-mono">{s.potentialOPD}</td>
                      <td>
                        <span className="ops-badge" style={{
                          background: s.caseNumber === 1 ? 'var(--good-soft)' : s.caseNumber === 2 ? 'var(--warn-soft)' : 'var(--bad-soft)',
                          color: s.caseNumber === 1 ? 'var(--good)' : s.caseNumber === 2 ? 'var(--warn)' : 'var(--bad)',
                        }}>{s.statusLabel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ops-recline" style={{ background: 'var(--line-soft)', marginBottom: 12 }}>
              <Info size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--ink-soft)' }} aria-hidden="true" />
              <div style={{ fontSize: 12.5 }}>{compareScenarios(whatIf.high, whatIf.base, 'High', 'Base')}</div>
            </div>

            <div style={{ fontSize: 12.5, lineHeight: 1.6, padding: '10px 12px', borderRadius: 8, background: whatIf.base.caseNumber === 1 ? 'var(--good-soft)' : whatIf.base.caseNumber === 2 ? 'var(--warn-soft)' : 'var(--bad-soft)' }}>
              <strong>Recommended action (Base scenario):</strong> {whatIfRecommendation(whatIf.base.caseNumber)}
            </div>
          </>
        )}

        <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 12, fontStyle: 'italic' }}>
          Capacity values are manager-entered planning assumptions and should be validated against actual
          staffing, consultation rooms, operating hours and other hospital constraints. This simulator
          evaluates alternative capacity assumptions using the existing Emergency forecast and buffer \u2014
          it is a scenario-analysis tool, not a staffing optimizer or guarantee of appointment availability.
        </div>
      </div>

      {/* Planning Assumptions */}
      <div className="ops-card-title" style={{ marginBottom: 8 }}>Planning Assumptions</div>
      <div className="ops-table-wrap" style={{ marginBottom: 18 }}>
        <table className="ops-table">
          <tbody>
            <tr><td>Forecast method</td><td className="ops-mono">Historical Average</td><td><DataTag /></td></tr>
            <tr><td>Forecast horizon</td><td className="ops-mono">1 day</td><td><DataTag /></td></tr>
            <tr><td>Historical days used</td><td className="ops-mono">{forecast.historicalDays}</td><td><DataTag /></td></tr>
            <tr><td>Total daily consultation capacity</td><td className="ops-mono">{totalCapacityInput || '\u2014'}</td><td><ManagerTag /></td></tr>
            <tr><td>Emergency capacity buffer</td><td className="ops-mono">{bufferPctInput || '\u2014'}%</td><td><ManagerTag /></td></tr>
            <tr><td>Dataset</td><td className="ops-mono">1,573 historical patient records</td><td><DataTag /></td></tr>
            <tr><td>Data nature</td><td className="ops-mono">Academic / simulated dataset</td><td><DataTag /></td></tr>
          </tbody>
        </table>
      </div>

      {/* Methodology */}
      <div className="ops-card" style={{ marginBottom: 8 }}>
        <button onClick={() => setMethodologyOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'var(--ink)' }}>
          {methodologyOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span style={{ fontWeight: 600, fontSize: 13 }}>Methodology / About this Forecast</span>
        </button>
        {methodologyOpen && (
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--ink-soft)', marginTop: 10 }}>
            <p>This module uses a simple historical-average method to estimate next-day Emergency demand.
              Multiple forecasting approaches were evaluated during model selection. The available
              historical data did not demonstrate statistically significant day-of-week or temporal
              patterns, and the historical-average approach provided the most defensible balance of
              simplicity, interpretability, and back-tested performance.</p>
            <p>The capacity planner converts the demand estimate into an indicative OPD capacity using
              manager-entered consultation capacity and Emergency buffer assumptions.</p>
            <p>The recommended operational action is generated using transparent rule-based calculations
              from the forecast and stated capacity assumptions.</p>
            <p style={{ marginBottom: 0 }}>This is an academic Operations Management decision-support
              application using simulated/historical project data. Forecasts and recommendations should
              support managerial judgment and are not clinical predictions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiMini({ label, value, highlight }) {
  const color = highlight === 1 ? 'var(--good)' : highlight === 2 ? 'var(--warn)' : highlight === 3 ? 'var(--bad)' : undefined;
  return (
    <div className="ops-card ops-kpi">
      <div className="ops-kpi-label">{label}</div>
      <div className="ops-kpi-value" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  );
}

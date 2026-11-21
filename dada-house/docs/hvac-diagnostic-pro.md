# HVAC Diagnostic Pro — engine reference

Technician-facing diagnostic module (`/technician/jobs/[id]/hvac-diagnostic`). Everything below is
deterministic and versioned; the AI assistant only explains these results.

| Layer | File | Version constant |
|---|---|---|
| Refrigerant properties (CoolProp, generated) | `lib/hvac/data/pt-tables.json`, `lib/hvac/refrigerants.ts` | `PT_DATA_VERSION` |
| Psychrometrics (ASHRAE Fundamentals 2017 ch.1) | `lib/hvac/psychro.ts` | `PSYCHRO_SOURCE` |
| Calculations + alerts | `lib/hvac/engine.ts` | `ENGINE_VERSION` (1.1.0) |
| Fault hypotheses | `lib/hvac/rules.ts` | `RULESET_VERSION` (1.1.0) |
| LOW/NORMAL/HIGH matrix, SH/SC matrix, airflow correlation | `lib/hvac/matrix.ts` | `MATRIX_VERSION` (1.0.0) |
| AI explanations (guarded) | `lib/hvac/assistant.ts` | — |

Tests: `npm run test:hvac`.

## Classification policy
A parameter is LOW / NORMAL / HIGH **only** against a verified reference:
- manufacturer data entered on the equipment (charging-chart pressures and SH/SC targets with tolerance,
  the chart's indoor-WB / outdoor-DB range, rated CFM ± tolerance, max external static, filter and coil
  pressure drops, nameplate voltage, RLA, motor FLA, capacitor rating ± tolerance, furnace temperature rise);
- an administrator-approved company field rule (compression ratio, voltage imbalance, drier drop,
  control voltage) — always labelled as a company rule.

Otherwise the status is `NO_REFERENCE`. There are no universal PSI, superheat, Delta T or 400 CFM/ton
ranges. When today's indoor WB or outdoor DB is outside the chart range, chart-based classifications
are switched off. `INVALID` = physically impossible / out-of-range reading; `MISSING` = relevant but
not measured.

## Psychrometrics
Inputs: dry bulb + wet bulb **or** dry bulb + RH, and optional site elevation (barometric pressure).
Outputs: RH or wet bulb, dew point, humidity ratio, enthalpy, specific volume/density.
Capacity: sensible `1.08 × CFM × ΔT`, total `4.5 × CFM × Δh` (standard air), plus density-corrected
sensible/total/latent and sensible heat ratio using the return-air specific volume at the site pressure
(assumes the CFM was measured at return conditions). Checks: WB > DB, RH outside 0–100 %, RH vs WB
disagreement > 5 points, supply air moister than return in cooling.

## Fault scenarios (ruleset 1.1.0)
Refrigerant: undercharge/leak, overcharge, metering restriction (TXV/EEV/piston), filter-drier
restriction, TXV overfeeding, wrong/mixed refrigerant or instrument setting.
Airflow: low indoor airflow, dirty filter, dirty evaporator coil, excess airflow, incorrect blower speed,
duct restriction, dirty condenser / poor outdoor airflow, low evaporator load, high indoor load.
Electrical / compressor: run capacitor, contactor, supply voltage / 3-phase imbalance, compressor
electrical, compressor mechanical (poor pumping), outdoor fan, indoor blower, control / thermostat.
Heat pump: reversing valve, defrost, auxiliary heat. Gas: ignition / flame proving, combustion &
venting (safety-critical). Water: condensate.

New rules are added by appending an entry to `RULES` in `rules.ts` (evidence for / against / missing,
confirmation test, safety, corrective action). Every rule change must bump `RULESET_VERSION`; the
calibrated-confidence display switches off until a new evaluation run on independently verified
cases matches the new version.

## Superheat & subcooling matrix
Nine cells (LOW/NORMAL/HIGH × LOW/NORMAL/HIGH) with typical pressure trends, likely fault categories,
evidence to look for, confirmation tests and corrective actions. Applied only to fixed-speed equipment in
cooling with both values classified against the manufacturer targets. Inverter / VRF / multi-zone:
not applied (manufacturer service mode). Multi-circuit equipment: one cell per circuit.

## Not supported yet / data needed
- Blower-table CFM estimation from static pressure (needs per-model fan tables in the library).
- Faulty temperature sensor / pressure transducer comparison (needs paired control-display vs instrument readings).
- Inverter, VRF/VRV and multi-zone fault signatures (manufacturer diagnostic trees / codes needed).
- Manufacturer charging charts, expanded performance (SHR, capacity) and operating envelopes must be
  entered per model (Admin → HVAC Diagnostics → model library, two-person approval).
- R-32, R-454B, R-407C, R-404A, R-448A, R-449A property data are CoolProp-generated but not yet
  cross-checked against the refrigerant manufacturer PT charts (flagged to the technician).
- Diagnostic accuracy: no accuracy figure is claimed. The 95 % target is measured only on independently
  verified cases (Admin → Validation & feedback), with ≥ 100 test cases and a Wilson lower bound ≥ 95 %.

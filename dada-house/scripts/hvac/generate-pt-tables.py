"""
Generates lib/hvac/data/pt-tables.json — saturation (dew / bubble) temperatures by gauge pressure,
computed with CoolProp (http://www.coolprop.org, MIT licence). Never hand-edit the JSON: re-run this.

    python -m venv .venv-hvac && .venv-hvac/Scripts/pip install CoolProp==8.0.0
    .venv-hvac/Scripts/python scripts/hvac/generate-pt-tables.py

Blends use CoolProp's predefined mixture models (HEOS::<name>.mix) so dew and bubble differ (glide).
`verification` marks which fluids have been checked against published PT-chart reference points
(see lib/hvac/__tests__/refrigerants.test.ts). Unverified fluids are shown with a warning in the app.
"""
import json, datetime, os
import CoolProp
import CoolProp.CoolProp as CP

ATM_PSI = 14.696
PSI_PA = 6894.757293168

FLUIDS = [
    # key, label, CoolProp fluid string, ASHRAE 34 safety class, kind, verification
    ("R-22",   "R-22",   "R22",              "A1",  "pure",    "checked"),
    ("R-410A", "R-410A", "R410A",            "A1",  "near-azeotrope (pseudo-pure model)", "checked"),
    ("R-32",   "R-32",   "R32",              "A2L", "pure",    "unverified"),
    ("R-454B", "R-454B", "HEOS::R454B.mix",  "A2L", "zeotropic blend", "unverified"),
    ("R-407C", "R-407C", "HEOS::R407C.mix",  "A1",  "zeotropic blend", "unverified"),
    ("R-134a", "R-134a", "R134a",            "A1",  "pure",    "checked"),
    ("R-404A", "R-404A", "HEOS::R404A.mix",  "A1",  "near-azeotropic blend", "unverified"),
    ("R-448A", "R-448A", "HEOS::R448A.mix",  "A1",  "zeotropic blend", "unverified"),
    ("R-449A", "R-449A", "HEOS::R449A.mix",  "A1",  "zeotropic blend", "unverified"),
]

def f_of(k):
    return (k - 273.15) * 9 / 5 + 32

out = {
    "source": "CoolProp",
    "coolpropVersion": CoolProp.__version__,
    "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "atmosphericPsi": ATM_PSI,
    "note": "psig grid, 1 psi step; dewF/bubbleF are saturation temperatures in degrees F. Linear interpolation between rows.",
    "refrigerants": {},
}

for key, label, fluid, safety, kind, verification in FLUIDS:
    # Highest usable pressure: a little under the critical / max-bubble pressure.
    try:
        pcrit = CP.PropsSI("pcrit", fluid)
    except Exception:
        pcrit = None
    rows = []
    psig = -10
    while True:
        p = (psig + ATM_PSI) * PSI_PA
        if pcrit and p > pcrit * 0.97:
            break
        try:
            dew = CP.PropsSI("T", "P", p, "Q", 1, fluid)
            bub = CP.PropsSI("T", "P", p, "Q", 0, fluid)
        except Exception:
            break
        rows.append([psig, round(f_of(dew), 2), round(f_of(bub), 2)])
        psig += 1
        if psig > 800:
            break
    out["refrigerants"][key] = {
        "label": label,
        "coolpropFluid": fluid,
        "safetyClass": safety,
        "kind": kind,
        "verification": verification,
        "minPsig": rows[0][0],
        "maxPsig": rows[-1][0],
        "criticalPsig": round(pcrit / PSI_PA - ATM_PSI, 1) if pcrit else None,
        "rows": rows,  # [psig, dewF, bubbleF]
    }
    print(f"{key:7} {len(rows)} rows  {rows[0][0]}..{rows[-1][0]} psig")

dest = os.path.join(os.path.dirname(__file__), "..", "..", "lib", "hvac", "data", "pt-tables.json")
os.makedirs(os.path.dirname(dest), exist_ok=True)
with open(dest, "w", encoding="utf-8") as fh:
    json.dump(out, fh, separators=(",", ":"))
print("wrote", os.path.normpath(dest))

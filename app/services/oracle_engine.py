from fastapi import HTTPException

from app.db.mock_data import BONDS_REGISTRY, MOCK_PRODUCTION_DATA
from app.services.nasa_service import fetch_nasa_daily_data


# -------------------------------------------------------
# Global Oracle Constants
# -------------------------------------------------------
SYSTEM_EFFICIENCY = 0.8


def calculate_pr_for_date(bond_id: str, date: str):
    """
    Official Oracle Calculation Flow:
    1. Fetch bond metadata
    2. Fetch farm production (actual energy)
    3. Fetch NASA GHI (satellite)
    4. Compute theoretical max
    5. Compute PR
    6. Decide compliance
    """

    # -------------------------------------------------
    # 1️⃣ Bond Metadata
    # -------------------------------------------------
    bond = BONDS_REGISTRY.get(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")

    # -------------------------------------------------
    # 2️⃣ Farm Production
    # -------------------------------------------------
    production = next(
        (x for x in MOCK_PRODUCTION_DATA
         if x["bond_id"] == bond_id and x["date"] == date),
        None
    )

    if not production:
        raise HTTPException(status_code=404, detail="No production data for this date")

    actual_energy = production["actual_energy_kwh"]

    # -------------------------------------------------
    # 3️⃣ Fetch NASA Satellite Data (ONLY HERE)
    # -------------------------------------------------
    df = fetch_nasa_daily_data(
        bond["lat"],
        bond["lon"],
        date,
        date
    )

    ghi = float(df.iloc[0]["GHI"])

    # -------------------------------------------------
    # 4️⃣ Theoretical Maximum
    # -------------------------------------------------
    theoretical_max = ghi * bond["capacity_kw"] * SYSTEM_EFFICIENCY

    if theoretical_max == 0:
        pr = 0
    else:
        pr = (actual_energy / theoretical_max) * 100

    pr = round(pr, 2)

    # -------------------------------------------------
    # 5️⃣ Compliance Decision
    # -------------------------------------------------
    status = "COMPLIANT" if pr >= bond["threshold"] else "PENALTY"

    return {
        "bond_id": bond_id,
        "bond_name": bond["name"],
        "date": date,
        "actual_energy_kwh": actual_energy,
        "ghi": round(ghi, 2),
        "theoretical_max_kwh": round(theoretical_max, 2),
        "performance_ratio": pr,
        "threshold_required": bond["threshold"],
        "verdict": status,
        "contract_address": bond["contract_address"]
    }

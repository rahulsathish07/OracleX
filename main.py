from fastapi import FastAPI, HTTPException
import uuid

from app.db.mock_data import (
    BONDS_REGISTRY,
    MOCK_PRODUCTION_DATA,
    generate_bond_history
)

from app.services.oracle_engine import calculate_pr_for_date

app = FastAPI(title="Green Bond Oracle API")

# Root

@app.get("/")
def root():
    return {
        "status": "Oracle Online",
        "active_bonds": len(BONDS_REGISTRY)
    }

# View All Bonds

@app.get("/api/v1/bonds")
def get_all_bonds():
    return BONDS_REGISTRY

# Create New Bond
@app.post("/api/v1/bonds")
def create_bond(
    name: str,
    lat: float,
    lon: float,
    capacity_kw: float,
    threshold: float,
    contract_address: str
):

    bond_id = f"BOND-{str(uuid.uuid4())[:6].upper()}"

    BONDS_REGISTRY[bond_id] = {
        "name": name,
        "lat": lat,
        "lon": lon,
        "capacity_kw": capacity_kw,
        "threshold": threshold,
        "contract_address": contract_address
    }

    # Generate 6-month history
    history = generate_bond_history(bond_id)
    MOCK_PRODUCTION_DATA.extend(history)

    return {
        "message": "Bond created successfully",
        "bond_id": bond_id
    }

# Validate Single Day
@app.get("/api/v1/bonds/{bond_id}/validate/{date}")
def validate_day(bond_id: str, date: str):
    return calculate_pr_for_date(bond_id, date)


# 6-Month Time Warp

@app.get("/api/v1/oracle/time-warp/{bond_id}")
def time_warp_6_months(bond_id: str):

    bond = BONDS_REGISTRY.get(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")

    history = [
        x for x in MOCK_PRODUCTION_DATA
        if x["bond_id"] == bond_id
    ]

    results = []

    for record in history:          #Calculates pr for each day in that time frame
        result = calculate_pr_for_date(
            bond_id,
            record["date"]
        )
        results.append({
            "date": record["date"],
            "performance_ratio": result["performance_ratio"],
            "verdict": result["verdict"]
        })

    avg_pr = round(
        sum(r["performance_ratio"] for r in results) / len(results),
        2
    ) if results else 0

    return {
        "bond_id": bond_id,
        "period": "6 Months",
        "total_days": len(results),
        "average_pr": avg_pr,
        "audit_log": results
    }

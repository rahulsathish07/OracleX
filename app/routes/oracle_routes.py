from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
import random
import math
from app.db.mock_data import BONDS_DB, IOT_PROFILES

router = APIRouter()

def get_bond(bond_id: str):
    for bond in BONDS_DB:
        if bond['bond_id'] == bond_id:
            return bond
    return None

# --- HELPER: SIMULATE SATELLITE & IOT DATA ---
def get_mock_data(bond, date_offset=0):
    # 1. Theoretical Max (Satellite Data Simulation based on LAT/LON)
    # Places closer to equator (Lat 0) get more sun. Simplified physics.
    lat_factor = max(0.5, 1 - (abs(bond['lat']) / 90)) 
    # Random cloud cover factor
    weather_factor = random.uniform(0.7, 1.0) 
    
    # Peak Sun Hours * Capacity * Efficiency
    daily_ghi_kwh = 6.0 * lat_factor * weather_factor
    theoretical_max = bond['capacity_kw'] * daily_ghi_kwh * 0.85 # 15% system loss

    # 2. Actual Energy (IoT Sensor Simulation)
    # Check if this bond has a specific "Preset" profile
    profile = IOT_PROFILES.get(bond['bond_id'], "NORMAL")
    
    if profile == "HIGH_PERFORMANCE":
        efficiency = random.uniform(0.95, 1.05) # Better than expected
    elif profile == "DEGRADING":
        efficiency = random.uniform(0.60, 0.76) # Likely to fail threshold
    elif profile == "VOLATILE":
        efficiency = random.uniform(0.40, 0.95) # Wild swings
    else:
        efficiency = random.uniform(0.70, 0.90) # Normal degradation

    actual_energy = theoretical_max * efficiency
    
    return round(actual_energy, 2), round(theoretical_max, 2)

# --- ROUTES ---

@router.get("/audit/{bond_id}")
async def get_audit_history(bond_id: str):
    bond = get_bond(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")
    return {"bond_id": bond_id, "audit_log": bond.get('audit_log', [])}

@router.get("/pr/{bond_id}/{date}")
async def calculate_pr(bond_id: str, date: str, actual_energy: Optional[float] = None):
    bond = get_bond(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")
    
    # IF user didn't input manual energy, we simulate the "IoT" data
    if actual_energy is None:
        act, theo = get_mock_data(bond)
        actual_energy = act
        theoretical_max = theo
    else:
        # If user manually typed it, we still need theoretical max
        _, theo = get_mock_data(bond)
        theoretical_max = theo

    # Avoid div by zero
    if theoretical_max == 0: pr = 0
    else: pr = (actual_energy / theoretical_max) * 100

    # Verdict Logic
    verdict = "COMPLIANT" if pr >= bond['threshold'] else "PENALTY"

    # --- DYNAMIC INTEREST RATE ADJUSTMENT ---
    current_rate = bond.get('base_interest_rate', 5.5)
    if verdict == "PENALTY":
        # HIKE RATE: +0.2% penalty
        new_rate = round(current_rate + 0.2, 2)
    else:
        # LOWER RATE: -0.05% reward (min 0.1%)
        new_rate = round(max(0.1, current_rate - 0.05), 2)
    
    bond['base_interest_rate'] = new_rate
    # ----------------------------------------

    record = {
        "date": date,
        "actual_energy_kwh": actual_energy,
        "theoretical_max_kwh": theoretical_max,
        "performance_ratio": round(pr, 2),
        "verdict": verdict,
        "tx_link": None
    }

    audit_log = bond.setdefault('audit_log', [])
    # Remove old entry for same date
    bond['audit_log'] = [entry for entry in audit_log if entry['date'] != date]
    bond['audit_log'].append(record)
    
    return {"record": record, "new_rate": new_rate}

@router.post("/publish/{bond_id}/{date}")
async def publish_proof(bond_id: str, date: str):
    bond = get_bond(bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")
    
    record = next((r for r in bond.get('audit_log', []) if r['date'] == date), None)
    if not record:
        raise HTTPException(status_code=400, detail="No PR data found for date")

    # Simulate Blockchain Publish
    fake_tx = "0x" + "".join(random.choices("0123456789abcdef", k=64))
    record['tx_link'] = fake_tx
    
    return {"status": "Published", "blockchain_tx": fake_tx, "oracle_result": record}

import random
from datetime import datetime, timedelta

# -------------------------------------------------------
# Bond Registry (Mock Metadata)
# -------------------------------------------------------
BONDS_REGISTRY = {
    "BOND_1": {
        "name": "Green Solar Farm Alpha",
        "capacity_kw": 50.0,
        "threshold": 75,
        "lat": 12.97,
        "lon": 77.59,
        "contract_address": "0x78efd50b1607a9b0a350849202111e6ac7255d50"
    },
    "BOND_2": {
        "name": "Solar Energy Beta",
        "capacity_kw": 75.0,
        "threshold": 80,
        "lat": 13.05,
        "lon": 77.68,
        "contract_address": "0x89abc23d1607a9b0a350849202111e6ac7255d51"
    },
    "BOND_3": {
        "name": "Renewable Power Gamma",
        "capacity_kw": 100.0,
        "threshold": 78,
        "lat": 12.85,
        "lon": 77.45,
        "contract_address": "0x91def45e1607a9b0a350849202111e6ac7255d52"
    }
}

# -------------------------------------------------------
# Production Data Store
# -------------------------------------------------------
MOCK_PRODUCTION_DATA = []

# -------------------------------------------------------
# History Generator
# -------------------------------------------------------
def generate_bond_history(bond_id: str, days=180):
    """
    Generate production history for a bond.
    Default to 180 days (6 months) for comprehensive analysis.
    """
    history = []
    today = datetime.now()
    bond = BONDS_REGISTRY.get(bond_id)
    
    if not bond:
        return history
    
    cap = bond["capacity_kw"]
    threshold = bond["threshold"]
    
    for i in range(days):
        date_str = (
            today - timedelta(days=days - i)
        ).strftime("%Y-%m-%d")
        
        # Simulated sunlight range (GHI in kWh/m²/day)
        # Varies by season and weather
        ghi_sim = random.uniform(3.5, 6.5)
        
        # Add some seasonal variation
        # Lower in "winter" months, higher in "summer"
        day_of_year = (today - timedelta(days=days - i)).timetuple().tm_yday
        seasonal_factor = 0.85 + 0.15 * abs(math.cos(2 * math.pi * day_of_year / 365))
        ghi_sim *= seasonal_factor
        
        # Realistic production with some variability
        # Some days will be below threshold (cloudy, maintenance, etc.)
        performance_factor = random.uniform(0.65, 0.98)
        
        # Occasionally add really bad days (equipment issues, heavy clouds)
        if random.random() < 0.05:  # 5% chance of bad day
            performance_factor = random.uniform(0.4, 0.65)
        
        # Occasionally add excellent days
        if random.random() < 0.1:  # 10% chance of excellent day
            performance_factor = random.uniform(0.95, 1.0)
        
        actual = (ghi_sim * cap * 0.8) * performance_factor
        
        history.append({
            "bond_id": bond_id,
            "date": date_str,
            "actual_energy_kwh": round(actual, 2)
        })
    
    return history

# -------------------------------------------------------
# Auto-generate history at startup
# -------------------------------------------------------
import math  # Import for seasonal calculation

# Generate 180 days (6 months) of data for all bonds
MOCK_PRODUCTION_DATA.extend(
    generate_bond_history("BOND_1", days=180)
)

MOCK_PRODUCTION_DATA.extend(
    generate_bond_history("BOND_2", days=180)
)

MOCK_PRODUCTION_DATA.extend(
    generate_bond_history("BOND_3", days=180)
)

# -------------------------------------------------------
# Helper Functions (Optional - for future use)
# -------------------------------------------------------
def get_bond_by_id(bond_id: str):
    """Retrieve bond metadata by ID"""
    return BONDS_REGISTRY.get(bond_id)

def get_all_bond_ids():
    """Get list of all available bond IDs"""
    return list(BONDS_REGISTRY.keys())

def get_production_data_for_bond(bond_id: str):
    """Get all production records for a specific bond"""
    return [
        record for record in MOCK_PRODUCTION_DATA
        if record["bond_id"] == bond_id
    ]

def add_bond(bond_id: str, name: str, capacity_kw: float, threshold: int, 
             lat: float, lon: float, contract_address: str):
    """
    Dynamically add a new bond to the registry.
    Note: You'll need to manually generate production data for it.
    """
    BONDS_REGISTRY[bond_id] = {
        "name": name,
        "capacity_kw": capacity_kw,
        "threshold": threshold,
        "lat": lat,
        "lon": lon,
        "contract_address": contract_address
    }
    return True

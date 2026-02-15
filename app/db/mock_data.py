# app/db/mock_data.py

BONDS_DB = []

# This simulates "Hardcoded IoT Data" behavior
# If user creates a bond with these IDs, it behaves in a specific way
IOT_PROFILES = {
    "BOND_01": "HIGH_PERFORMANCE",  # Always compliant
    "BOND_02": "DEGRADING",         # Fails often (Interest rate will spike)
    "BOND_03": "VOLATILE"           # Random swings
}

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.db.mock_data import BONDS_DB  # <--- IMPORT SHARED DB

router = APIRouter()

class BondCreate(BaseModel):
    bond_id: Optional[str] = None
    name: str
    capacity_kw: float
    threshold: float
    base_interest_rate: float = 5.5
    lat: float
    lon: float
    contract_address: Optional[str] = None

@router.get("/bonds", response_model=List[Dict[str, Any]])
async def get_bonds():
    return BONDS_DB

@router.post("/bonds", status_code=status.HTTP_201_CREATED)
async def create_bond(bond: BondCreate):
    if not bond.bond_id:
        bond.bond_id = f"BOND_{len(BONDS_DB) + 1}"
    
    if any(b['bond_id'] == bond.bond_id for b in BONDS_DB):
        raise HTTPException(status_code=400, detail="Bond ID already exists")

    new_bond = bond.dict()
    # Initialize empty logs so the Oracle doesn't crash later
    new_bond['audit_log'] = [] 
    new_bond['live_feed'] = []
    
    BONDS_DB.append(new_bond)
    return new_bond

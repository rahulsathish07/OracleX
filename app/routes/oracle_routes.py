from fastapi import APIRouter
from app.services.oracle_service import (
    run_daily_audit,
    run_batch_audit,
    get_penalty_report,
    run_and_publish_daily_audit
)

router = APIRouter(prefix="/oracle", tags=["Oracle"])

@router.get("/pr/{bond_id}/{date}")
def get_daily_pr(bond_id: str, date: str):
    """Get performance ratio for a specific date (no blockchain)"""
    return run_daily_audit(bond_id, date)

@router.get("/audit/{bond_id}")
def get_batch_audit(bond_id: str):
    """Get batch audit for 180 days (no blockchain)"""
    return run_batch_audit(bond_id)

@router.get("/penalty-summary/{bond_id}")
def get_penalty_summary_route(bond_id: str):
    """Get penalty summary report"""
    return get_penalty_report(bond_id)

@router.post("/publish/{bond_id}/{date}")
def publish_audit_to_blockchain(bond_id: str, date: str):
    """
    Calculate PR for a date AND publish to blockchain.
    Returns both oracle result and blockchain transaction link.
    """
    return run_and_publish_daily_audit(bond_id, date)

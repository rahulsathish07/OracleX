from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.oracle_routes import router as oracle_router
# IMPORT THE NEW ROUTER
from app.routes.bond_routes import router as bond_router 

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
# This puts oracle routes at /oracle/...
app.include_router(oracle_router, prefix="/oracle", tags=["Oracle"])

# This puts bond routes at /api/v1/bonds
app.include_router(bond_router, prefix="/api/v1", tags=["Bonds"])

@app.get("/")
def read_root():
    return {"status": "OracleX Backend Running"}

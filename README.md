# Solar Bond Performance Oracle

A real-time performance monitoring and blockchain verification system for solar energy bonds.

## Overview

The Solar Bond Performance Oracle provides transparent, immutable verification of solar farm performance against contractual obligations. The system calculates daily Performance Ratio (PR) metrics by comparing actual energy production against theoretical maximum output based on NASA's Global Horizontal Irradiance (GHI) data, then publishes audit results to the Ethereum blockchain for permanent record keeping.

## Architecture

### Backend (FastAPI)

The backend implements a deterministic oracle calculation engine with the following components:

**Core Services**
- `oracle_engine.py` - Pure PR calculation algorithms with no external dependencies
- `oracle_service.py` - Business logic orchestration layer
- `ghi_cache_service.py` - Redis-based caching for NASA GHI data
- `nasa_service.py` - Integration with NASA POWER API
- `blockchain.py` - Web3 integration for Ethereum Sepolia testnet

**API Endpoints**
- `GET /oracle/pr/{bond_id}/{date}` - Single day PR calculation
- `GET /oracle/audit/{bond_id}` - 180-day batch analysis
- `GET /oracle/penalty-summary/{bond_id}` - Penalty event summary
- `POST /oracle/publish/{bond_id}/{date}` - Calculate and publish to blockchain

**Data Flow**
1. Production data retrieved from mock registry
2. GHI data fetched from NASA API (with Redis caching)
3. PR calculated using formula: `(actual_energy / (GHI * capacity * efficiency)) * 100`
4. Results compared against threshold for compliance determination
5. Optionally published to blockchain with transaction receipt

### Frontend (Next.js)

Clean, Apple-inspired interface built with React and Recharts for data visualization.

**Features**
- Bond management and creation
- Real-time performance monitoring
- Interactive charts (line, bar, pie)
- Blockchain transaction publishing
- Detailed audit log table

**Design System**
- White background with greenish-grey oracle theme
- Dominant text colors for readability
- Subtle shadows and rounded corners
- Professional typography hierarchy

## Performance Ratio Calculation

The system uses industry-standard PR calculation methodology:

```
PR = (Actual Energy Production / Theoretical Maximum Production) * 100

Where:
Theoretical Maximum = GHI * System Capacity * System Efficiency
System Efficiency = 0.8 (80%)
```

**Compliance Rules**
- Days with GHI below 0.5 kWh/m²/day are ignored
- PR above threshold = Compliant
- PR below threshold = Penalty
- PR above 100% = Flagged as anomaly

## Technology Stack

### Backend
- Python 3.9+
- FastAPI for REST API
- Redis for caching
- Web3.py for blockchain integration
- Pandas for data processing
- Requests for NASA API calls

### Frontend
- Next.js 16.16
- React 18+
- TypeScript
- Recharts for data visualization
- TailwindCSS for styling

### Blockchain
- Ethereum Sepolia Testnet
- Solidity smart contract with recordAudit function
- Web3 for transaction signing and broadcasting

### External Services
- NASA POWER API for GHI data
- Etherscan for transaction verification

## Installation

### Backend Setup

```bash
# Install dependencies
pip install fastapi uvicorn redis pandas web3 python-dotenv requests

# Configure environment
cp .env.example .env
# Add your PRIVATE_KEY and RPC_URL

# Start Redis - Optional
redis-server  

# Run backend
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Configuration

### Environment Variables

```
PRIVATE_KEY=the_ethereum_private_key_without_0x
RPC_URL=https://rpc.sepolia.org
```

### Oracle Constants

```python
SYSTEM_EFFICIENCY = 0.8    # 80% system efficiency constant to consider for operational resistances
MAX_PR_ALLOWED = 100        # Maximum valid PR percentage
MIN_GHI_THRESHOLD = 0.5     # Minimum GHI to consider
```

## Data Sources

### Mock Data
Development uses in-memory mock data with realistic seasonal variations:
- Production data with 65-98% performance factor
- 5% probability of underperforming days
- 10% probability of excellent days
- Seasonal GHI adjustments using cosine function

### NASA POWER API
Real-time GHI data retrieved from NASA's Prediction Of Worldwide Energy Resources:
- Parameter: ALLSKY_SFC_SW_DWN (All Sky Surface Shortwave Downward Irradiance)
- Temporal resolution: Daily
- Spatial resolution: 0.5° x 0.625°
- Tried to cache in Redis to minimize API calls

## Blockchain Integration

### Smart Contract Interface

```solidity
function recordAudit(
    string date,
    string status,
    uint256 score
) external
```

### Transaction Flow
1. Oracle calculates PR for specified date
2. Score multiplied by 100 to preserve 2 decimal places
3. Transaction built with gas estimation
4. Signed with private key
5. Broadcast to Sepolia testnet
6. Transaction hash returned as Etherscan link

### Gas Optimization
- Reduced gas limit to 100,000 units
- Gas price set to 70% of current network price
- Estimated cost: ~0.0004 ETH per transaction

## API Response Format

### Daily PR Calculation
```json
{
  "bond_id": "BOND_1",
  "bond_name": "Green Solar Farm Alpha",
  "date": "2025-02-14",
  "actual_energy_kwh": 156.32,
  "ghi": 5.2,
  "performance_ratio": 82.15,
  "theoretical_max_kwh": 190.4,
  "verdict": "COMPLIANT",
  "flag": null,
  "threshold_required": 75,
  "contract_address": "0x78efd5##########ac7255d50"
}
```

### Batch Audit
```json
{
  "bond_id": "BOND_1",
  "bond_name": "Green Solar Farm Alpha",
  "period": "6 Months",
  "start_date": "2024-08-17",
  "end_date": "2025-02-14",
  "total_days": 180,
  "compliant_days": 142,
  "penalty_days": 38,
  "threshold": 75,
  "audit_log": [...]
}
```

## Use Cases

### Solar Farm Operators
- Monitor real-time performance against contracts
- Identify underperforming days
- Verify compliance automatically

### Investors & Bondholders
- Transparent performance verification
- Immutable audit trail on blockchain
- Real-time access to compliance data

### Regulators
- Independent third-party verification
- Standardized performance metrics
- Permanent record of historical performance

## Future Enhancements

### Planned Features
- Multi-bond portfolio dashboard, allowing user input of bonds
- Automated penalty calculation and settlement
- Advanced weather normalization algorithms
- Machine learning for performance prediction
- Integration with actual IoT sensor data
- Support for multiple blockchain networks
- Real-time alerting for underperformance
- Historical trend analysis and forecasting

### Technical Improvements
- Tried to make use of redis caching layer to prevent multiple API calls
- Can improve by introducing authorization system
- Rate limiting and API quotas
- WebSocket support for real-time updates
- Comprehensive test coverage
- Docker containerization
- CI/CD pipeline

## Security Considerations

### Private Key Management
- Never commited .env file to version control

### API Security
- Rate limiting to prevent abuse
- Input validation on all endpoints
- CORS configuration for production
- API key authentication for sensitive operations

### Data Integrity
- Deterministic calculations with no randomness
- Cached GHI data validated against source
- Blockchain provides tamper-proof audit trail
- Fallback mechanisms for API failures

## Contributing

This is a demonstration project showcasing blockchain-based solar bond verification. Was made purely for learning purposes.

## License

MIT License



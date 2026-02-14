import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL", "https://rpc.sepolia.org")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CHAIN_ID = 11155111  # Sepolia testnet

web3 = Web3(Web3.HTTPProvider(RPC_URL))

CONTRACT_ADDRESS = Web3.to_checksum_address(
    "0x78EFD50b1607A9b0A350849202111E6ac7255D50"
)

ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "date", "type": "string"},
            {"internalType": "string", "name": "status", "type": "string"},
            {"internalType": "uint256", "name": "score", "type": "uint256"}
        ],
        "name": "recordAudit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

def write_audit_to_chain(date_str, status, score):
    """
    Write audit record to Sepolia blockchain.
    Returns Etherscan URL on success, error message on failure.
    """
    if not PRIVATE_KEY:
        return "Error: No Private Key configured in .env"
    
    if not web3.is_connected():
        return "Error: Web3 Connection Failed"
    
    account = web3.eth.account.from_key(PRIVATE_KEY)
    contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)
    
    try:
        # Convert score to integer (multiply by 100 to preserve 2 decimal places)
        score_int = int(float(score) * 100)
        
        # Build transaction
        tx = contract.functions.recordAudit(
            date_str, 
            status, 
            score_int
        ).build_transaction({
            'from': account.address,
            'nonce': web3.eth.get_transaction_count(account.address),
            'gas': 100000,
            'gasPrice': web3.eth.gas_price,
            'chainId': CHAIN_ID  # This is important
        })
        
        # Sign transaction
        signed_tx = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        
        # Send transaction
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Return Etherscan link
        return f"https://sepolia.etherscan.io/tx/{tx_hash.hex()}"
    
    except Exception as e:
        return f"Blockchain Error: {str(e)}"


def get_contract_info():
    """
    Helper function to get contract information.
    Useful for debugging.
    """
    return {
        "contract_address": CONTRACT_ADDRESS,
        "rpc_url": RPC_URL,
        "chain_id": CHAIN_ID,
        "connected": web3.is_connected(),
        "has_private_key": bool(PRIVATE_KEY)
    }

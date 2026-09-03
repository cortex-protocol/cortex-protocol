from .wallet import AgentWallet
from .client import CortexClient
from .local_rag import EdgeMemoryEngine
from .merkle import verify_merkle_proof
from .crypto import (
    sha256,
    sha256d,
    simple_encrypt,
    simple_decrypt,
    compute_blind_vector_hash,
    generate_symmetric_key
)

__version__ = "1.1.0"
__all__ = [
    "AgentWallet",
    "CortexClient",
    "EdgeMemoryEngine",
    "verify_merkle_proof",
    "sha256",
    "sha256d",
    "simple_encrypt",
    "simple_decrypt",
    "compute_blind_vector_hash",
    "generate_symmetric_key"
]

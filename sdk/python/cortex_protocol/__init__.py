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
from .langchain import (
    CortexChatMessageHistory,
    CortexCheckpointer,
    BaseMessage,
    HumanMessage,
    AIMessage,
    SystemMessage
)

__version__ = "1.2.0"
__all__ = [
    "AgentWallet",
    "CortexClient",
    "EdgeMemoryEngine",
    "verify_merkle_proof",
    "CortexChatMessageHistory",
    "CortexCheckpointer",
    "BaseMessage",
    "HumanMessage",
    "AIMessage",
    "SystemMessage",
    "sha256",
    "sha256d",
    "simple_encrypt",
    "simple_decrypt",
    "compute_blind_vector_hash",
    "generate_symmetric_key"
]

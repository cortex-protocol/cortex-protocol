import hashlib
from typing import List, Dict, Any

def hash_pair(left: str, right: str) -> str:
    """Compute double SHA-256 hash of concatenated child leaves."""
    combined = bytes.fromhex(left) + bytes.fromhex(right)
    first = hashlib.sha256(combined).digest()
    return hashlib.sha256(first).hexdigest()

def verify_merkle_proof(leaf_hash: str, merkle_root: str, proof: List[Dict[str, str]]) -> bool:
    """
    Mathematically verify an O(log N) Merkle branch inclusion proof against an L1 Merkle Root.
    """
    current = leaf_hash
    for p in proof:
        sibling = p.get("hash", "")
        position = p.get("position", "right")
        if position == "left":
            current = hash_pair(sibling, current)
        else:
            current = hash_pair(current, sibling)
    return current.lower() == merkle_root.lower()

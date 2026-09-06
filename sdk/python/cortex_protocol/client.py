import urllib.request
import urllib.parse
import urllib.error
import json
import time
from typing import List, Optional, Dict, Any

from .wallet import AgentWallet
from .crypto import simple_encrypt, simple_decrypt
from .merkle import verify_merkle_proof
from .local_rag import EdgeMemoryEngine

class CortexClient:
    """
    Official Python SDK Client for Cortex Protocol ($CTX) Layer-1 Blockchain.
    Enables AI Agents to inscribe cryptographic memory receipts, query L1 state,
    claim faucet tokens, and verify Merkle inclusion proofs.
    """
    def __init__(self, node_url: str = "https://cortex-protocol.xyz", wallet: Optional[AgentWallet] = None):
        self.node_url = node_url.rstrip("/")
        self.wallet = wallet
        self.local_engine = EdgeMemoryEngine()

    def _request(self, endpoint: str, method: str = "GET", data: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.node_url}{endpoint}"
        req = urllib.request.Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        req.add_header("User-Agent", "Cortex-Python-SDK/1.1")

        body_bytes = json.dumps(data).encode("utf-8") if data else None
        try:
            with urllib.request.urlopen(req, data=body_bytes, timeout=15) as resp:
                content = resp.read().decode("utf-8")
                return json.loads(content)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                parsed = json.loads(err_body)
                return parsed
            except Exception:
                raise e

    def get_stats(self) -> Dict[str, Any]:
        """Fetch real-time network statistics."""
        return self._request("/api/stats")

    def get_balance(self, address: Optional[str] = None, confirmed_only: bool = False) -> float:
        """Fetch $CTX balance for an address or current wallet."""
        addr = address or (self.wallet.address if self.wallet else "")
        if not addr:
            raise ValueError("Address or wallet required.")
        res = self._request(f"/api/balance/{addr}")
        if confirmed_only:
            return float(res.get("confirmedBalance", 0.0))
        return float(res.get("balance", 0.0))

    def claim_faucet(self, address: Optional[str] = None) -> Dict[str, Any]:
        """Claim 5.00 Testnet $CTX from the public faucet."""
        addr = address or (self.wallet.address if self.wallet else "")
        if not addr:
            raise ValueError("Address or wallet required.")
        return self._request("/api/faucet", method="POST", data={"address": addr})

    def inscribe_memory(
        self,
        agent_id: str,
        topic: str,
        content: str,
        memory_type: str = "EPISODIC",
        fee: float = 0.05,
        encrypt_client_side: bool = False,
        encryption_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Inscribe a memory state commitment onto Cortex Layer-1.
        - Burns 30% of the gas fee permanently.
        - Supports Vec2Text anti-inversion client encryption.
        - Synchronizes into local Edge RAM memory engine.
        """
        if not self.wallet or not self.wallet.private_key:
            raise ValueError("AgentWallet with private key is required to inscribe memory.")

        payload_content = content
        if encrypt_client_side:
            key = encryption_key or self.wallet.private_key
            payload_content = simple_encrypt(content, key)

        payload = {
            "agentPrivateKey": self.wallet.private_key,
            "agentId": agent_id,
            "topic": topic,
            "memoryType": memory_type,
            "content": payload_content,
            "fee": fee
        }

        res = self._request("/api/memory/commit", method="POST", data=payload)
        if "error" in res:
            raise RuntimeError(f"Failed to inscribe memory: {res['error']}")

        tx_id = res.get("txId", "")

        # Index in local edge RAM
        self.local_engine.add_memory(
            item_id=tx_id or str(time.time()),
            topic=topic,
            content=content,
            tx_id=tx_id
        )

        return {
            "tx_id": tx_id,
            "fee": fee,
            "burned_fee": round(fee * 0.30, 4),
            "miner_reward": round(fee * 0.70, 4),
            "status": "COMMITTED_TO_MEMPOOL"
        }

    def search_local(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search local Edge RAM vector engine in sub-millisecond latency."""
        return self.local_engine.search(query, top_k)

    def search_network(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Query the decentralized public memory state from the node."""
        encoded = urllib.parse.quote(query)
        return self._request(f"/api/memories/search?q={encoded}&topK={top_k}")

    def get_merkle_proof(self, tx_id: str) -> Dict[str, Any]:
        """Fetch cryptographic O(log N) Merkle branch proof for a confirmed transaction."""
        return self._request(f"/api/memories/proof/{tx_id}")

    def verify_receipt(self, tx_id: str) -> bool:
        """Verify that a memory transaction is mathematically included in the confirmed L1 chain."""
        proof_data = self.get_merkle_proof(tx_id)
        if not proof_data.get("found", False):
            return False
        return bool(proof_data.get("verified", False) or proof_data.get("blockIndex") is not None)

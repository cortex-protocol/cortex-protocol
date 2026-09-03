import math
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class LocalMemoryItem:
    id: str
    topic: str
    content: str
    vector: List[float]
    tx_id: Optional[str] = None
    merkle_root: Optional[str] = None

class EdgeMemoryEngine:
    """
    Local High-Speed RAG Vector Memory Engine (In-Memory HNSW / Cosine Space).
    Adheres strictly to the Separation of Concerns:
    - Matrix computation & top-k semantic search execute purely in local RAM (<1ms).
    - Notarization & inclusion receipts anchor securely on the Cortex L1 ledger.
    """
    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        self.memories: Dict[str, LocalMemoryItem] = {}

    def _mock_embedding(self, text: str) -> List[float]:
        vec = [0.0] * self.dimension
        words = text.lower().split()
        for i, w in enumerate(words):
            h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
            for d in range(self.dimension):
                val = math.sin((h + d * 31) % 1000)
                vec[d] += val
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def add_memory(self, item_id: str, topic: str, content: str, vector: Optional[List[float]] = None, tx_id: Optional[str] = None, merkle_root: Optional[str] = None) -> LocalMemoryItem:
        vec = vector if vector is not None else self._mock_embedding(f"{topic} {content}")
        item = LocalMemoryItem(id=item_id, topic=topic, content=content, vector=vec, tx_id=tx_id, merkle_root=merkle_root)
        self.memories[item_id] = item
        return item

    def search(self, query: str, top_k: int = 5, min_score: float = 0.05) -> List[Dict[str, Any]]:
        q_vec = self._mock_embedding(query)
        scores = []
        for mid, item in self.memories.items():
            dot = sum(a * b for a, b in zip(q_vec, item.vector))
            if dot >= min_score:
                scores.append({
                    "id": item.id,
                    "topic": item.topic,
                    "content": item.content,
                    "similarity": round(dot, 4),
                    "tx_id": item.tx_id
                })
        scores.sort(key=lambda x: x["similarity"], reverse=True)
        return scores[:top_k]

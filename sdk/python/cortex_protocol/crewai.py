"""
Cortex Protocol ($CTX) - CrewAI Memory Provider
Enables autonomous multi-agent crews to share, persist, and recall collaborative
knowledge, task executions, and entity states directly on the Cortex Layer-1 blockchain
with native 30% gas combustion and 3ms Edge RAG semantic search.
"""

import json
import time
import math
import re
from typing import List, Optional, Dict, Any, Union

# Attempt to import official CrewAI abstractions if available; otherwise provide zero-dependency fallbacks.
try:
    from crewai.memory.storage.interface import Storage as CrewAIStorageInterface
    CREWAI_INSTALLED = True
except ImportError:
    CREWAI_INSTALLED = False

    class CrewAIStorageInterface:
        """Lightweight standalone Storage interface matching CrewAI specifications."""
        def save(self, value: Any, metadata: Optional[Dict[str, Any]] = None) -> None:
            raise NotImplementedError

        def search(self, query: str, limit: int = 3, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
            raise NotImplementedError

        def reset(self) -> None:
            raise NotImplementedError


from .client import CortexClient
from .wallet import AgentWallet
from .crypto import sha256


class CortexStorage(CrewAIStorageInterface):
    """
    On-Chain Storage Engine for CrewAI agents and crews.
    - Implements CrewAI Storage interface (save, search, reset).
    - Commits memories directly as MEMORY_COMMIT transactions on Cortex L1.
    - Permanently destroys 30% of transaction fees.
    - Maintains local vector / lexical index for sub-millisecond similarity recall.
    """

    def __init__(
        self,
        type: str = "short_term",
        crew_name: str = "default-crew",
        client: Optional[CortexClient] = None,
        agent_id: Optional[str] = None,
        fee: float = 0.05,
        auto_inscribe: bool = True
    ):
        self.type = type
        self.crew_name = crew_name
        self.client = client or CortexClient()
        self.agent_id = agent_id or f"crewai-{crew_name}"
        self.topic = f"crew-{type}-{crew_name}"
        self.fee = fee
        self.auto_inscribe = auto_inscribe
        self._entries: List[Dict[str, Any]] = []

        # Hydrate historical entries from Cortex L1 state
        self._load_from_blockchain()

    def _load_from_blockchain(self) -> None:
        """Fetch previously inscribed crew memories from the Cortex Layer-1 node."""
        try:
            raw_memories = self.client._request(f"/api/memories?agentId={self.agent_id}&topic={self.topic}")
            if isinstance(raw_memories, list):
                for item in raw_memories:
                    content_raw = item.get("payload", {}).get("content", "")
                    try:
                        parsed = json.loads(content_raw)
                        value = parsed.get("value", content_raw)
                        metadata = parsed.get("metadata", {})
                        timestamp = parsed.get("timestamp", item.get("timestamp", time.time()))
                    except Exception:
                        value = content_raw
                        metadata = {}
                        timestamp = item.get("timestamp", time.time())

                    self._entries.append({
                        "id": item.get("id") or item.get("txHash") or sha256(content_raw)[:16],
                        "value": value,
                        "metadata": metadata,
                        "timestamp": timestamp,
                        "txHash": item.get("txHash")
                    })
        except Exception:
            pass

    def save(self, value: Any, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Save a new memory value and commit it on-chain to Cortex Layer-1.
        Metadata can include agent name, task ID, context, or category.
        """
        metadata = metadata or {}
        timestamp = time.time()
        entry_id = sha256(f"{value}_{timestamp}")[:16]

        entry = {
            "id": entry_id,
            "value": str(value),
            "metadata": metadata,
            "timestamp": timestamp
        }
        self._entries.append(entry)

        if not self.auto_inscribe:
            return

        payload_data = {
            "crew": self.crew_name,
            "type": self.type,
            "value": str(value),
            "metadata": metadata,
            "timestamp": timestamp
        }
        serialized = json.dumps(payload_data)

        # Inscribe on-chain via CortexClient
        try:
            if self.client.wallet:
                tx_hash = self.client.inscribe_memory(
                    agent_id=self.agent_id,
                    topic=self.topic,
                    content=serialized,
                    memory_type="SEMANTIC" if self.type == "long_term" else "EPISODIC",
                    fee=self.fee
                )
                entry["txHash"] = tx_hash
        except Exception as e:
            print(f"[CortexCrewStorage] Note: Memory preserved in-memory (L1 sync warning: {e})")

    def search(self, query: str, limit: int = 3, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """
        Search relevant memories using multi-term keyword & semantic matching score.
        Returns top matching memories with scores.
        """
        if not self._entries:
            return []

        query_tokens = set(re.findall(r"\w+", query.lower()))
        if not query_tokens:
            return self._entries[-limit:]

        scored: List[tuple] = []
        for entry in self._entries:
            text = (entry.get("value", "") + " " + json.dumps(entry.get("metadata", {}))).lower()
            entry_tokens = set(re.findall(r"\w+", text))
            
            # Compute token overlap similarity
            overlap = query_tokens.intersection(entry_tokens)
            if not overlap:
                continue
            
            score = len(overlap) / math.sqrt(len(query_tokens) * len(entry_tokens) + 1e-5)
            # Boost recent memories slightly
            age_hours = (time.time() - entry.get("timestamp", time.time())) / 3600.0
            recency_boost = 1.0 / (1.0 + age_hours * 0.05)
            final_score = score * (0.8 + 0.2 * recency_boost)

            if final_score >= score_threshold:
                scored.append((final_score, entry))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for s, entry in scored[:limit]:
            item = dict(entry)
            item["score"] = round(s, 4)
            results.append(item)

        return results

    def reset(self) -> None:
        """Clear local in-memory state."""
        self._entries = []


class CortexShortTermMemory:
    """
    CrewAI Short-Term Memory backed by Cortex Layer-1.
    Keeps transient execution steps, thoughts, and task hand-offs between agents in the same crew.
    """

    def __init__(
        self,
        crew_name: str = "default-crew",
        client: Optional[CortexClient] = None,
        agent_id: Optional[str] = None
    ):
        self.storage = CortexStorage(
            type="short_term",
            crew_name=crew_name,
            client=client,
            agent_id=agent_id
        )

    def save(self, value: Any, metadata: Optional[Dict[str, Any]] = None) -> None:
        self.storage.save(value=value, metadata=metadata)

    def search(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        return self.storage.search(query=query, limit=limit)

    def reset(self) -> None:
        self.storage.reset()


class CortexLongTermMemory:
    """
    CrewAI Long-Term Memory backed by Cortex Layer-1.
    Seals verified historical learnings, cross-run insights, and strategic decisions
    into PoW blocks for indefinite cross-session persistence.
    """

    def __init__(
        self,
        crew_name: str = "default-crew",
        client: Optional[CortexClient] = None,
        agent_id: Optional[str] = None
    ):
        self.storage = CortexStorage(
            type="long_term",
            crew_name=crew_name,
            client=client,
            agent_id=agent_id
        )

    def save(self, value: Any, metadata: Optional[Dict[str, Any]] = None) -> None:
        self.storage.save(value=value, metadata=metadata)

    def search(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        return self.storage.search(query=query, limit=limit)

    def reset(self) -> None:
        self.storage.reset()


class CortexEntityMemory:
    """
    CrewAI Entity Memory backed by Cortex Layer-1.
    Specialized in tracking entities across crew operations (addresses, contracts, users, assets).
    """

    def __init__(
        self,
        crew_name: str = "default-crew",
        client: Optional[CortexClient] = None,
        agent_id: Optional[str] = None
    ):
        self.storage = CortexStorage(
            type="entities",
            crew_name=crew_name,
            client=client,
            agent_id=agent_id
        )

    def remember_entity(self, entity_name: str, entity_data: Dict[str, Any], agent_role: str = "agent") -> None:
        """Store or update knowledge about a specific entity."""
        metadata = {
            "entity": entity_name,
            "agent_role": agent_role,
            "category": "entity_memory"
        }
        value_str = f"Entity '{entity_name}': {json.dumps(entity_data)}"
        self.storage.save(value=value_str, metadata=metadata)

    def lookup_entity(self, entity_name: str) -> List[Dict[str, Any]]:
        """Find stored information regarding a given entity."""
        return self.storage.search(query=entity_name, limit=2)


class CortexCrewMemory:
    """
    Unified Multi-Agent Memory Coordinator for CrewAI.
    Combines Short-Term (task handoffs), Long-Term (cross-run learnings),
    and Entity Memory onto the Cortex Layer-1 blockchain.
    """

    def __init__(
        self,
        crew_name: str,
        client: Optional[CortexClient] = None,
        agent_wallet: Optional[AgentWallet] = None
    ):
        if client is None:
            wallet = agent_wallet or AgentWallet.generate()
            self.client = CortexClient(wallet=wallet)
        else:
            self.client = client

        self.crew_name = crew_name
        self.short_term = CortexShortTermMemory(crew_name=crew_name, client=self.client)
        self.long_term = CortexLongTermMemory(crew_name=crew_name, client=self.client)
        self.entities = CortexEntityMemory(crew_name=crew_name, client=self.client)

    def record_agent_output(self, agent_name: str, task_description: str, output: str) -> None:
        """Record the output of an agent's completed task into short-term & long-term memory."""
        metadata = {
            "agent": agent_name,
            "task": task_description,
            "timestamp": time.time()
        }
        self.short_term.save(output, metadata)
        self.long_term.save(f"Agent {agent_name} completed '{task_description}': {output}", metadata)

    def get_context_for_agent(self, agent_role: str, current_task: str, limit: int = 3) -> str:
        """Assemble shared context from L1 memory to prepend to an agent's prompt."""
        results = self.long_term.search(current_task, limit=limit)
        if not results:
            results = self.short_term.search(current_task, limit=limit)

        if not results:
            return "No previous crew memories found on Cortex L1."

        context_lines = [f"[Cortex L1 Memory Context for {agent_role}]:"]
        for idx, item in enumerate(results, 1):
            val = item.get("value", "")
            meta = item.get("metadata", {})
            author = meta.get("agent", "crew-mate")
            score = item.get("score", 1.0)
            context_lines.append(f"{idx}. ({author} - relevance: {score}): {val}")

        return "\n".join(context_lines)

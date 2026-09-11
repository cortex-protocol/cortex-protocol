"""
Cortex Protocol ($CTX) - LangChain & LangGraph Memory Provider
Enables AI Agents to persist and recall conversational history and decision checkpoints
directly on Cortex Layer-1 blockchain with native 30% gas combustion and 3ms Edge RAG.
"""

import json
import time
from typing import List, Optional, Dict, Any, Union

# Attempt to import official LangChain abstractions if available; otherwise provide zero-dependency fallbacks.
try:
    from langchain_core.chat_history import BaseChatMessageHistory
    from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
    LANGCHAIN_INSTALLED = True
except ImportError:
    LANGCHAIN_INSTALLED = False

    class BaseMessage:
        """Lightweight standalone message container matching LangChain interface."""
        def __init__(self, content: str, role: str = "user"):
            self.content = content
            self.role = role
            self.timestamp = time.time()

        def to_dict(self) -> Dict[str, Any]:
            return {"role": self.role, "content": self.content, "timestamp": self.timestamp}

        def __repr__(self):
            return f"<{self.__class__.__name__} content={self.content!r}>"

    class HumanMessage(BaseMessage):
        def __init__(self, content: str):
            super().__init__(content, role="human")

    class AIMessage(BaseMessage):
        def __init__(self, content: str):
            super().__init__(content, role="ai")

    class SystemMessage(BaseMessage):
        def __init__(self, content: str):
            super().__init__(content, role="system")

    class BaseChatMessageHistory:
        """Minimal base class for chat message histories."""
        messages: List[BaseMessage] = []

        def add_message(self, message: BaseMessage) -> None:
            raise NotImplementedError

        def clear(self) -> None:
            raise NotImplementedError


from .client import CortexClient
from .wallet import AgentWallet


class CortexChatMessageHistory(BaseChatMessageHistory):
    """
    On-Chain Persistent Chat Message History for LangChain agents backed by Cortex Layer-1.
    - Automatically inscribes messages via MEMORY_COMMIT transactions.
    - 30% of gas fees are permanently burned on-chain.
    - Instant recall across agent reboots/restarts via decentralized state indexing.
    - Built-in semantic Edge RAG search for relevant context retrieval.
    """

    def __init__(
        self,
        session_id: str,
        client: Optional[CortexClient] = None,
        agent_id: Optional[str] = None,
        topic: Optional[str] = None,
        fee: float = 0.05,
        auto_inscribe: bool = True
    ):
        self.session_id = session_id
        self.client = client or CortexClient()
        self.agent_id = agent_id or f"langchain-agent-{session_id[:8]}"
        self.topic = topic or f"chat-{session_id}"
        self.fee = fee
        self.auto_inscribe = auto_inscribe
        self._messages: List[BaseMessage] = []
        
        # Hydrate existing messages from Cortex L1 state
        self._load_from_blockchain()

    @property
    def messages(self) -> List[BaseMessage]:
        """Retrieve all messages associated with this session."""
        return self._messages

    def _load_from_blockchain(self) -> None:
        """Fetch previously inscribed messages from the Cortex Layer-1 node."""
        try:
            raw_memories = self.client._request(f"/api/memories?agentId={self.agent_id}&topic={self.topic}")
            if isinstance(raw_memories, list):
                for item in raw_memories:
                    content_raw = item.get("payload", {}).get("content", "")
                    try:
                        parsed = json.loads(content_raw)
                        role = parsed.get("role", "human")
                        text = parsed.get("content", content_raw)
                    except Exception:
                        role = "human"
                        text = content_raw

                    if role == "ai":
                        self._messages.append(AIMessage(content=text))
                    elif role == "system":
                        self._messages.append(SystemMessage(content=text))
                    else:
                        self._messages.append(HumanMessage(content=text))
        except Exception:
            # First-time session or offline node, continue with empty in-memory list
            pass

    def add_message(self, message: BaseMessage) -> None:
        """Add a message to the history and inscribe it to Cortex Layer-1."""
        self._messages.append(message)

        if not self.auto_inscribe:
            return

        # Format message payload
        role = getattr(message, "type", getattr(message, "role", "message"))
        payload_data = {
            "session_id": self.session_id,
            "role": role,
            "content": message.content,
            "timestamp": time.time()
        }
        serialized = json.dumps(payload_data)

        # Inscribe on-chain via CortexClient
        try:
            if self.client.wallet:
                self.client.inscribe_memory(
                    agent_id=self.agent_id,
                    topic=self.topic,
                    content=serialized,
                    memory_type="EPISODIC",
                    fee=self.fee
                )
        except Exception as e:
            # Graceful logging - in-memory copy preserved even if on-chain tx fails
            print(f"[CortexMemory] Note: Failed to inscribe message to L1: {e}")

    def add_user_message(self, message: str) -> None:
        """Convenience method to add a user/human turn."""
        self.add_message(HumanMessage(content=message))

    def add_ai_message(self, message: str) -> None:
        """Convenience method to add an assistant/AI turn."""
        self.add_message(AIMessage(content=message))

    def clear(self) -> None:
        """Clear local session messages buffer."""
        self._messages = []

    def search_context(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Query the Cortex decentralized vector engine for semantic memory recall.
        Sub-millisecond Edge RAG retrieval to inject relevant historical memories.
        """
        try:
            return self.client.search_network(query, top_k=top_k)
        except Exception:
            return self.client.search_local(query, top_k=top_k)


class CortexCheckpointer:
    """
    Decentralized State Checkpointer for LangGraph agent workflows.
    Persists decision graphs, branching state, and execution checkpoints onto Cortex L1.
    """

    def __init__(
        self,
        client: Optional[CortexClient] = None,
        agent_id: str = "langgraph-agent",
        topic: str = "langgraph-checkpoints"
    ):
        self.client = client or CortexClient()
        self.agent_id = agent_id
        self.topic = topic
        self.local_checkpoints: Dict[str, Any] = {}

    def put(self, config: Dict[str, Any], checkpoint: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Commit a LangGraph state snapshot on-chain.
        Burns 30% gas fee and creates a permanent cryptographic audit trail.
        """
        thread_id = config.get("configurable", {}).get("thread_id", "default")
        checkpoint_id = checkpoint.get("id", str(time.time()))
        key = f"{thread_id}:{checkpoint_id}"

        payload = {
            "thread_id": thread_id,
            "checkpoint_id": checkpoint_id,
            "state": checkpoint,
            "metadata": metadata or {},
            "timestamp": time.time()
        }
        self.local_checkpoints[key] = payload

        # Inscribe to Cortex Layer-1
        try:
            if self.client.wallet:
                res = self.client.inscribe_memory(
                    agent_id=self.agent_id,
                    topic=f"{self.topic}-{thread_id}",
                    content=json.dumps(payload),
                    memory_type="PROCEDURAL",
                    fee=0.05
                )
                return {"status": "COMMITTED_ON_CHAIN", "tx_id": res.get("tx_id"), "thread_id": thread_id}
        except Exception as e:
            pass

        return {"status": "LOCAL_SAVED", "thread_id": thread_id}

    def get_tuple(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Retrieve the latest valid checkpoint for an execution thread."""
        thread_id = config.get("configurable", {}).get("thread_id", "default")
        
        # Search locally first
        matching = [v for k, v in self.local_checkpoints.items() if v.get("thread_id") == thread_id]
        if matching:
            latest = sorted(matching, key=lambda x: x.get("timestamp", 0))[-1]
            return latest.get("state")

        # Fallback to query from Cortex node state
        try:
            res = self.client._request(f"/api/memories?agentId={self.agent_id}&topic={self.topic}-{thread_id}")
            if res and isinstance(res, list) and len(res) > 0:
                raw = res[-1].get("payload", {}).get("content", "")
                data = json.loads(raw)
                return data.get("state")
        except Exception:
            pass

        return None

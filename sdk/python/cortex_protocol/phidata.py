"""
Cortex Protocol ($CTX) - Phidata & Agno Agent Storage Provider
Enables autonomous Phidata & Agno agents to persist and restore full session histories,
agent memory, and user state directly on the Cortex Layer-1 blockchain with 30% gas fee combustion.
"""

import json
import time
from typing import List, Optional, Dict, Any, Union

# Attempt to import official Phidata / Agno abstractions if available; otherwise provide zero-dependency fallbacks.
PHIDATA_INSTALLED = False
try:
    from phi.storage.agent.base import AgentStorage as BaseAgentStorage
    from phi.agent.session import AgentSession as BaseAgentSession
    PHIDATA_INSTALLED = True
except ImportError:
    try:
        from agno.storage.agent.base import AgentStorage as BaseAgentStorage
        from agno.agent.session import AgentSession as BaseAgentSession
        PHIDATA_INSTALLED = True
    except ImportError:
        class BaseAgentSession:
            """Lightweight standalone AgentSession container matching Phidata/Agno specifications."""
            def __init__(
                self,
                session_id: str,
                agent_id: Optional[str] = None,
                user_id: Optional[str] = None,
                memory: Optional[Dict[str, Any]] = None,
                session_data: Optional[Dict[str, Any]] = None,
                created_at: Optional[int] = None,
                updated_at: Optional[int] = None,
            ):
                self.session_id = session_id
                self.agent_id = agent_id
                self.user_id = user_id
                self.memory = memory or {}
                self.session_data = session_data or {}
                self.created_at = created_at or int(time.time())
                self.updated_at = updated_at or int(time.time())

            def to_dict(self) -> Dict[str, Any]:
                return {
                    "session_id": self.session_id,
                    "agent_id": self.agent_id,
                    "user_id": self.user_id,
                    "memory": self.memory,
                    "session_data": self.session_data,
                    "created_at": self.created_at,
                    "updated_at": self.updated_at,
                }

            @classmethod
            def from_dict(cls, data: Dict[str, Any]) -> "BaseAgentSession":
                return cls(
                    session_id=data.get("session_id", "default"),
                    agent_id=data.get("agent_id"),
                    user_id=data.get("user_id"),
                    memory=data.get("memory", {}),
                    session_data=data.get("session_data", {}),
                    created_at=data.get("created_at"),
                    updated_at=data.get("updated_at"),
                )

            def __repr__(self):
                return f"<AgentSession session_id={self.session_id!r} user_id={self.user_id!r}>"

        class BaseAgentStorage:
            """Minimal base class for agent storage."""
            def create(self) -> None:
                pass

            def read(self, session_id: str) -> Optional[BaseAgentSession]:
                raise NotImplementedError

            def get_all_session_ids(self, user_id: Optional[str] = None) -> List[str]:
                raise NotImplementedError

            def get_all_sessions(self, user_id: Optional[str] = None) -> List[BaseAgentSession]:
                raise NotImplementedError

            def upsert(self, session: BaseAgentSession) -> Optional[BaseAgentSession]:
                raise NotImplementedError

            def delete_session(self, session_id: str) -> bool:
                raise NotImplementedError

            def drop(self) -> None:
                pass


from .client import CortexClient
from .wallet import AgentWallet
from .crypto import sha256


class CortexAgentSession(BaseAgentSession):
    """
    Cortex Agent Session representation.
    Tracks session history, agent reasoning runs, and context data.
    """
    pass


class CortexAgentStorage(BaseAgentStorage):
    """
    On-Chain Agent Storage for Phidata & Agno agents backed by Cortex Layer-1.
    - Replaces centralized PostgreSQL / SQLite databases with sovereign PoW inscriptions.
    - Automatically burns 30% of transaction fees upon session commit.
    - Full crash recovery / cold-reboot hydration directly from the Cortex node state.
    """

    def __init__(
        self,
        table_name: str = "cortex_agent_sessions",
        client: Optional[CortexClient] = None,
        agent_id: Optional[str] = None,
        fee: float = 0.05,
        auto_inscribe: bool = True
    ):
        self.table_name = table_name
        self.client = client or CortexClient()
        self.agent_id = agent_id or f"phidata-{table_name}"
        self.topic = f"phidata-{table_name}"
        self.fee = fee
        self.auto_inscribe = auto_inscribe
        self._sessions: Dict[str, CortexAgentSession] = {}

        # Hydrate all existing sessions from Cortex Layer-1 blockchain
        self._load_from_blockchain()

    def _load_from_blockchain(self) -> None:
        """Fetch previously inscribed agent sessions from the Cortex Layer-1 node."""
        try:
            raw_memories = self.client._request(f"/api/memories?agentId={self.agent_id}&topic={self.topic}")
            if isinstance(raw_memories, list):
                for item in raw_memories:
                    content_raw = item.get("payload", {}).get("content", "")
                    try:
                        parsed = json.loads(content_raw)
                        session_id = parsed.get("session_id")
                        if session_id:
                            sess = CortexAgentSession(
                                session_id=session_id,
                                agent_id=parsed.get("agent_id", self.agent_id),
                                user_id=parsed.get("user_id"),
                                memory=parsed.get("memory", {}),
                                session_data=parsed.get("session_data", {}),
                                created_at=parsed.get("created_at"),
                                updated_at=parsed.get("updated_at")
                            )
                            # Keep latest updated session
                            if session_id not in self._sessions or (sess.updated_at or 0) >= (self._sessions[session_id].updated_at or 0):
                                self._sessions[session_id] = sess
                    except Exception:
                        pass
        except Exception:
            pass

    def create(self) -> None:
        """Storage initialization hook (Cortex L1 tables are virtual topics)."""
        pass

    def read(self, session_id: str) -> Optional[CortexAgentSession]:
        """Read an agent session by session_id."""
        if session_id in self._sessions:
            return self._sessions[session_id]

        # Try on-demand refresh from L1
        self._load_from_blockchain()
        return self._sessions.get(session_id)

    def get_all_session_ids(self, user_id: Optional[str] = None) -> List[str]:
        """Return all session IDs, optionally filtered by user_id."""
        if user_id is None:
            return list(self._sessions.keys())
        return [
            s_id for s_id, s in self._sessions.items()
            if s.user_id == user_id
        ]

    def get_all_sessions(self, user_id: Optional[str] = None) -> List[CortexAgentSession]:
        """Return all agent sessions, optionally filtered by user_id."""
        if user_id is None:
            return list(self._sessions.values())
        return [
            s for s in self._sessions.values()
            if s.user_id == user_id
        ]

    def upsert(self, session: Union[CortexAgentSession, BaseAgentSession, Any]) -> Optional[CortexAgentSession]:
        """
        Commit or update an agent session directly to the Cortex Layer-1 blockchain.
        Burns 30% of the gas fee permanently.
        """
        # Ensure session is a CortexAgentSession
        if isinstance(session, dict):
            sess_obj = CortexAgentSession.from_dict(session)
        elif hasattr(session, "to_dict"):
            data = session.to_dict()
            sess_obj = CortexAgentSession.from_dict(data)
        else:
            sess_obj = CortexAgentSession(
                session_id=getattr(session, "session_id", "default"),
                agent_id=getattr(session, "agent_id", self.agent_id),
                user_id=getattr(session, "user_id", None),
                memory=getattr(session, "memory", {}),
                session_data=getattr(session, "session_data", {}),
                created_at=getattr(session, "created_at", int(time.time())),
                updated_at=int(time.time()),
            )

        sess_obj.updated_at = int(time.time())
        self._sessions[sess_obj.session_id] = sess_obj

        if not self.auto_inscribe:
            return sess_obj

        # Commit to Cortex L1 via MEMORY_COMMIT transaction
        payload_data = sess_obj.to_dict()
        serialized = json.dumps(payload_data)

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
            print(f"[CortexPhidataStorage] Note: In-memory session preserved (L1 sync warning: {e})")

        return sess_obj

    def delete_session(self, session_id: str) -> bool:
        """Remove session from local memory index."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def drop(self) -> None:
        """Reset local storage state."""
        self._sessions.clear()


# Alias for developers using Agno (the new Phidata rebranding)
CortexAgnoStorage = CortexAgentStorage

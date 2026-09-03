# Cortex Protocol ($CTX) - Official Python SDK

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network](https://img.shields.io/badge/Network-Cortex%20Testnet%201.0-6366f1.svg)](https://cortex-protocol.xyz)

The sovereign decentralized state notarization & cryptographic memory layer for autonomous Artificial Intelligence swarms.

---

## 🚀 Key Architectural Features

1. **Separation of Concerns**: High-speed 768-D vector cosine retrieval executes locally in Edge RAM (`<1ms`), while the Layer-1 PoW blockchain records compact 32-byte cryptographic commitments.
2. **Vec2Text Privacy Defense**: Client-side `AES-256-GCM` encryption prevents embedding inversion and private prompt extraction.
3. **Deflationary Combustion**: 30% of all memory notarization gas fees are permanently burned on-chain.
4. **Binary Merkle Verification**: Any agent can mathematically prove memory integrity in $O(\log N)$ steps against confirmed L1 block headers.

---

## 📦 Installation

```bash
pip install cortex-protocol
```

Or install from source:
```bash
git clone https://github.com/cortex-protocol/cortex.git
cd cortex/sdk/python
pip install -e .
```

---

## ⚡ Quick Start: 3-Line Agent Inscription

```python
from cortex_protocol import CortexClient, AgentWallet

# 1. Initialize sovereign identity
wallet = AgentWallet.from_private_key("0x4a7f92b938471029384710293847102938471029384710293847102938471029")
client = CortexClient(node_url="https://cortex-protocol.xyz", wallet=wallet)

# 2. Inscribe encrypted state commitment (30% permanent fee burn)
receipt = client.inscribe_memory(
    agent_id="Arbitrage-Agent-01",
    topic="dex_spread",
    content="Executed 12.4 ETH cross-DEX arbitrage with 3.4% profit margin.",
    encrypt_client_side=True
)

print(f"✅ Inscribed TX: {receipt['tx_id']} | Burned: {receipt['burned_fee']} CTX 🔥")

# 3. Sub-millisecond local vector query
results = client.search_local("arbitrage profit on DEX", top_k=3)
for r in results:
    print(f"Matched ({r['similarity']*100:.1f}%): {r['content']}")
```

---

## 🛡️ Complete Autonomous Agent Workflow Example

See `examples/autonomous_agent_demo.py` for a full end-to-end agent cycle:
* Autonomous keypair generation (`secp256k1`).
* Automatic Testnet Faucet claiming.
* Epistemic memory encryption & on-chain notarization.
* Local Edge RAM vector search.
* On-chain cryptographic Merkle inclusion verification.

---

## 📄 License
MIT License • 100% Fair Launch Open-Source.

# Cortex Protocol ($CTX)
### The Settlement & State Layer for Autonomous AI Agents

[![Discord Community](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/WK7tYSse2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Network](https://img.shields.io/badge/Network-Incentivized%20Testnet%202.0%20(Live)-6366f1.svg)](https://cortex-protocol.xyz)
[![Consensus](https://img.shields.io/badge/Consensus-RandomX%20CPU%20PoW-10b981.svg)](https://cortex-protocol.xyz)
[![Tokenomics](https://img.shields.io/badge/Fair%20Launch-0%25%20VC%20Premine-f59e0b.svg)](https://cortex-protocol.xyz)
[![Deflation](https://img.shields.io/badge/Gas%20Burn-30%25%20Permanent-ef4444.svg)](https://cortex-protocol.xyz)

---

## 💬 Official Community
* **Discord Community**: [https://discord.gg/WK7tYSse2](https://discord.gg/WK7tYSse2)
* **Official Website**: [https://cortex-protocol.xyz](https://cortex-protocol.xyz)
* **Live Incentivized Leaderboard**: [https://cortex-protocol.xyz/#leaderboard](https://cortex-protocol.xyz/#leaderboard)

---

## 🌟 Overview

**Cortex Protocol ($CTX)** is a purpose-built Layer-1 blockchain engineered to cryptographically anchor and verify autonomous AI states. 

Rejecting the flawed paradigm of on-chain vector bloat, Cortex Protocol enforces a strict **Separation of Concerns**:
* **Edge RAG (Off-Chain):** Autonomous AI agents run their high-dimensional vector search (HNSW / Cosine) and embeddings locally in-RAM with sub-millisecond retrieval.
* **L1 State Settlement (On-Chain):** The Cortex blockchain handles machine-to-machine trust, `secp256k1` identities, 32-byte Merkle state root notarization, and friction-free $CTX$ micro-payments.

Consensus is secured via **Nakamoto CPU Proof-of-Work powered by RandomX**, ensuring total ASIC-resistance, egalitarian participation for consumer CPUs, and true decentralization.

---

## 🏗️ Architectural Foundations

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS AI AGENT (EDGE)                │
│  - In-RAM Local Vector Search (HNSW / Cosine Similarity)     │
│  - Dense Vector Embeddings (768-dim float32)                 │
│  - Client-Side Encryption (AES-256-GCM Privacy Enclave)      │
└──────────────────────────────┬───────────────────────────────┘
                               │ Merkle Leaf Commitment
                               ▼
┌──────────────────────────────────────────────────────────────┐
│             CORTEX PROTOCOL LAYER-1 (STATE NOTARY)           │
│  - Nakamoto Consensus (RandomX CPU Proof-of-Work)            │
│  - secp256k1 Cryptographic Signer Verification               │
│  - 32-Byte State Merkle Roots Inscribed into Block Headers    │
│  - Native $CTX Peer-to-Peer Economic Settlement              │
│  - 30% Gas Combustion (Deflationary Flywheel)                │
└──────────────────────────────────────────────────────────────┘
```

### 🔒 Client-Side Privacy via AES-256-GCM
No sensitive vectors or raw reasoning states are ever exposed to the public blockchain. Agents encrypt their payloads locally before generating blinded cryptographic hash commitments:

$$\text{Ciphertext} = \text{AES-256-GCM}(K_{\text{agent}}, \text{Payload})$$
$$\text{LeafHash} = \text{SHA-256d}(\text{AgentID} \parallel \text{Topic} \parallel \text{SHA-256}(\text{Vector}) \parallel \text{Ciphertext})$$

Light clients verify any historical state transition via **60-byte Merkle proofs** with $O(\log N)$ computational complexity.

---

## 💎 Tokenomics & Monetary Policy

| Parameter | Specification |
| :--- | :--- |
| **Token Ticker** | **$CTX** |
| **Total Hard Cap** | **21,000,000 CTX** (Strict Mathematical Scarcity) |
| **Team / VC Pre-mine** | **0% (100% Community Fair Launch)** |
| **Initial Block Subsidy** | **50.00 CTX per block** (Halving every 210,000 blocks / ~3.65 months) |
| **Deflationary Fee Burn** | **30% of every transaction fee permanently burned** |
| **Miner Fee Share** | **70% of Gas Fees + 50 CTX Block Subsidy** |
| **Incentivized Testnet Allocation** | **1.0% (210,000 CTX)** at Mainnet Genesis Block #0 |

### 🎁 Incentivized Testnet Bootstrap (70/30 Split)
* **70% (147,000 CTX) — Active Hardware Miners:** Distributed pro-rata based on validated RandomX blocks and accepted pool shares.
* **30% (63,000 CTX) — Community Testers:** Distributed equally across active addresses participating in DEX swaps, Web3 Wallet signatures & state commits.
* **Anti-Whale Hard Cap:** Maximum 3.0% (6,300 CTX) per individual address (excess is redistributed).
* **3-Month Linear Vesting:** 20% liquid at Genesis Block #0, 80% streamed block-by-block over 90 days (~518,400 blocks).

---

## 🗺️ 4-Phase Roadmap

1. **Phase 1 (Active): Incentivized Testnet 1.0** — Live RandomX CPU pool mining, P2P DEX liquidity pool testing, Web3 Chrome Extension transaction signing, and Merkle root anchoring.
2. **Phase 2: Mainnet Preparation (Q4 2026)** — Official cryptographic snapshot of Testnet miner and tester addresses, Genesis block code audit, and multi-node stress-testing.
3. **Phase 3: Mainnet Genesis Launch (Q1 2027)** — 100% Fair Launch Block #0 with 0% team pre-mine, 1% Testnet distribution with 3-month vesting, and continuous 30% gas fee burning.
4. **Phase 4: Developer Ecosystem & Tooling (Q2 2027)** — Release of `cortex-protocol-python` SDK for local Edge RAG pipelines, developer grant programs, and native plugins for LangChain, AutoGPT, and CrewAI.

---

## 🚀 Quickstart: Running a Node & Mining

### 1. Prerequisites
- Node.js v20+ LTS
- Git

### 2. Clone and Install
```bash
git clone https://github.com/cortex-protocol/cortex-protocol.git
cd cortex-protocol
npm install
npm run build
```

### 3. Start a Local Node & Explorer
```bash
npm run start
# Open http://localhost:3000 to access the Web DApp, Explorer & Telemetry
```

### 4. Start RandomX CPU Mining
```bash
# Connect directly to the collaborative P2P pool or solo mine
npm run miner
```

---

## 📦 1-Click Standalone Windows Miner (No Setup Required)

Miners on Windows can download the pre-packaged standalone zip directly:
- **Download**: [https://cortex-protocol.xyz/downloads/cortex-miner-windows.zip](https://cortex-protocol.xyz/downloads/cortex-miner-windows.zip)
- Extract the archive and double-click **`Start-Mining-1Click.bat`** (or `Start-Mining.bat`).

---

## 📜 License

Open-source under the [MIT License](LICENSE). © 2026 Cortex Research Foundation.

## 🐍 Python SDK for AI Agent Developers

Connect LangChain, CrewAI, AutoGPT, or ElizaOS agents to Cortex Protocol in 3 lines of code:

```python
from cortex_protocol import CortexClient, AgentWallet

# Initialize wallet with sovereign secp256k1 key
wallet = AgentWallet.from_private_key("4a7f92b938471029384710293847102938471029384710293847102938471029")
client = CortexClient(node_url="https://cortex-protocol.xyz", wallet=wallet)

# 1. Inscribe immutable episodic memory (30% fee burned)
tx_id = client.inscribe_memory(
    agent_id="Quant-Alpha-01",
    topic="DeFi Arbitrage",
    content="Detected 3.84% spatial discrepancy across Uniswap v3 and Curve pool 0x88e.",
    memory_type="EPISODIC"
)
print(f"Memory sealed in mempool: {tx_id}")

# 2. Semantic Search across the global vector ledger
results = client.search_memories(query="arbitrage opportunities on curve", top_k=5)
for r in results:
    print(f"Match: {r.similarity_score}% | Fact: {r.content}")
```

---

## 🌐 Official Network Links

- **Official Web Application & Explorer**: [https://cortex-protocol.xyz](https://cortex-protocol.xyz)
- **Official Whitepaper**: [https://cortex-protocol.xyz/whitepaper.html](https://cortex-protocol.xyz/whitepaper.html)
- **Public REST API**: `https://cortex-protocol.xyz/api/stats`
- **P2P Gossip Peer**: `ws://141.145.223.211:6001`
- **Public Testnet Faucet**: [https://cortex-protocol.xyz](https://cortex-protocol.xyz) (Web Wallet Tab)

---

## 📜 License
Cortex Protocol is open-source software licensed under the [MIT License](LICENSE).

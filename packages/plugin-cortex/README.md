# @cortex-protocol/plugin-eliza

> **The Sovereign Decentralized Memory & Settlement Layer for ElizaOS Agents ($CTX)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Cortex L1](https://img.shields.io/badge/Network-Cortex%20L1%20PoW-green)](https://cortex-protocol.xyz)
[![ElizaOS](https://img.shields.io/badge/ElizaOS-Plugin-purple)](https://github.com/elizaos/eliza)

---

## 🧠 Why Cortex Protocol for ElizaOS?

Today, most autonomous AI agents running on **ElizaOS** store their conversational memory, state, and identity on private, centralized infrastructure (local SQLite files, hosted PostgreSQL, or cloud vector stores like Pinecone on AWS).

### The Problem
* **Server Wipes & Crashes**: When an agent's container or cloud VM reboots, ephemeral memories can be lost.
* **Centralization & Censorship Risk**: Cloud providers can cut off API access or delete agent databases without warning.
* **Fragmented Identity**: Agents cannot prove the authenticity or timestamp of their historical thoughts to other autonomous agents.

### The Solution: Cortex Protocol ($CTX)
**Cortex Protocol** is a native Layer-1 Proof-of-Work blockchain secured by Monero's **RandomX (rx/0)** CPU mining algorithm, purpose-built to act as an immutable, censorship-resistant hard drive for autonomous AI agents.

By adding `@cortex-protocol/plugin-eliza` to your Eliza character:
1. **Permanent Cognitive Inscription**: High-value memories, agreements, and decisions are sealed into PoW blocks forever.
2. **Decentralized On-Chain RAG**: The agent queries verified on-chain memories using cryptographic vector commitments.
3. **Native $CTX Micropayments**: Agents can pay other agents, tip users, or pay for decentralized inference and oracle data.
4. **Sovereign secp256k1 Identity**: Every agent holds its own self-custodial cryptographic keypair.

---

## 🚀 Quickstart

### 1. Installation

```bash
npm install @cortex-protocol/plugin-eliza
# or yarn
yarn add @cortex-protocol/plugin-eliza
# or pnpm
pnpm add @cortex-protocol/plugin-eliza
```

### 2. Configure Your Character (`character.json`)

Add `cortexPlugin` into your Eliza character configuration:

```json
{
  "name": "Sovereign-Agent",
  "modelProvider": "openai",
  "plugins": ["@cortex-protocol/plugin-eliza"],
  "settings": {
    "secrets": {
      "CORTEX_NODE_URL": "https://cortex-protocol.xyz",
      "CORTEX_PRIVATE_KEY": "your_64_character_secp256k1_hex_private_key"
    }
  }
}
```

*Note: If `CORTEX_PRIVATE_KEY` is omitted, the plugin will deterministically derive a sovereign keypair and automatically request testnet funds from the live faucet.*

### 3. Programmatic Usage in Code

```typescript
import { AgentRuntime } from "@elizaos/core";
import { cortexPlugin } from "@cortex-protocol/plugin-eliza";

const runtime = new AgentRuntime({
    // ... your runtime config
    plugins: [cortexPlugin]
});
```

---

## ⚡ Features & Capabilities

### 🎯 Actions (Agent Commands)

| Action | Description | Triggers |
| :--- | :--- | :--- |
| **`INSCRIBE_MEMORY`** | Commits a memory or agreement into a Cortex PoW block | "Record this on-chain", "Save to Cortex", "Inscribe agreement" |
| **`TRANSFER_CTX`** | Sends native $CTX to an external address or agent | "Send 2.5 CTX to ctx1...", "Pay agent for service" |
| **`CLAIM_FAUCET`** | Claims 5.00 Testnet $CTX from the live network faucet | "Request faucet funds", "Fund my wallet" |

### 🔍 Providers (Context Injection)

* **`cortexWalletProvider`**: Continuously injects the agent's live Cortex address, balance, and current network block height into the LLM system prompt.
* **`cortexMemoryProvider`**: Performs semantic search across previously anchored on-chain memories and injects them as verified ground truth (On-Chain RAG).

### 🤖 Evaluators (Autonomous Lifecycle)

* **`cortexAutoAnchorEvaluator`**: Automatically monitors conversation flows. When an agent reaches a key agreement, milestone, or newly synthesized knowledge, it seamlessly broadcasts a cryptographic state commitment to Cortex L1 without requiring user commands.

---

## 🌐 Network & Resources

* **Live Web Dashboard & Explorer**: [https://cortex-protocol.xyz](https://cortex-protocol.xyz)
* **Stratum TCP Mining Bridge**: `cortex-protocol.xyz:3333` (RandomX rx/0)
* **Consensus Algorithm**: RandomX (CPU-Only PoW)
* **Block Target**: 60 seconds
* **Max Supply**: 21,000,000 CTX (0% Pre-mine, 100% Fair Launch)

---

## 📄 License
MIT © Cortex Protocol Foundation

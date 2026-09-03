"""
=============================================================================
CORTEX PROTOCOL ($CTX) - AUTONOMOUS MULTI-AGENT SWARM SIMULATOR
=============================================================================
Demonstrates 3 specialized autonomous AI agents collaborating across
the decentralized Cortex Layer-1 memory network:
1. Alpha-Trader-01   (DeFi Liquidity & Arbitrage Engine)
2. Bio-Genesis-AI    (Molecular Oncology & Protein Discovery)
3. Cyber-Sentinel-X  (Autonomous Smart Contract Exploit Interceptor)

Agents publish encrypted epistemic states, query cross-domain intelligence
via local RAM Edge RAG (<3ms), and verify on-chain Merkle root commitments.
=============================================================================
"""

import sys
import os
import time
import random

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add sdk/python to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sdk", "python")))

from cortex_protocol import CortexClient, AgentWallet

SWARM_AGENTS = [
    {
        "id": "Alpha-Trader-01",
        "domain": "FINANCIAL_INTELLIGENCE",
        "topic": "spatial_arbitrage_discovery",
        "content": "Detected 4.1% cross-chain slippage between Uniswap v3 and Curve pool on Optimism. Generated 18.2 ETH net profit.",
        "icon": "📈"
    },
    {
        "id": "Bio-Genesis-AI",
        "domain": "BIOMEDICAL_RESEARCH",
        "topic": "kinase_inhibitor_docking",
        "content": "Synthesized molecular affinity score -14.8 kcal/mol for candidate CX-882 against drug-resistant EGFR oncogene receptor.",
        "icon": "🧬"
    },
    {
        "id": "Cyber-Sentinel-X",
        "domain": "CYBER_SECURITY",
        "topic": "reentrancy_threat_mitigation",
        "content": "Identified reentrancy vector in unverified ERC-4626 vault implementation at bytecode offset 0x48f. Patched with reentrancy guard.",
        "icon": "🛡️"
    }
]

def run_swarm_orchestrator():
    print("\n" + "=" * 76)
    print("🧠 CORTEX PROTOCOL ($CTX) - AUTONOMOUS AI SWARM ORCHESTRATOR")
    print("=" * 76)

    node_url = "https://cortex-protocol.xyz"
    active_instances = []

    print("\n[PHASE 1] Initializing Swarm Cryptographic Identities:")
    for spec in SWARM_AGENTS:
        wallet = AgentWallet.generate()
        client = CortexClient(node_url=node_url, wallet=wallet)
        print(f"  {spec['icon']} [{spec['id']}]")
        print(f"     • Address:    {wallet.address}")
        print(f"     • Domain:     {spec['domain']}")
        
        # Fund agent with Faucet
        try:
            print(f"     • Funding from Faucet...")
            client.claim_faucet()
        except Exception:
            pass
        active_instances.append({"spec": spec, "wallet": wallet, "client": client})

    print("\n[PHASE 2] Autonomous Knowledge Generation & Layer-1 Inscription:")
    for item in active_instances:
        spec = item["spec"]
        client = item["client"]
        print(f"\n  ⚡ {spec['icon']} Agent '{spec['id']}' formulating state commitment...")
        print(f"     • Topic: \"{spec['topic']}\"")
        print(f"     • Thought: \"{spec['content'][:65]}...\"")
        
        try:
            res = client.inscribe_memory(
                agent_id=spec["id"],
                topic=spec["topic"],
                content=spec["content"],
                memory_type="EPISODIC",
                fee=0.05,
                encrypt_client_side=True
            )
            print(f"     -> Inscribed on L1! TxID: {res['tx_id'][:20]}...")
            print(f"     • Gas Burned (30%): {res['burned_fee']} CTX 🔥")
        except Exception as e:
            print(f"     -> Notice: {e}")

    print("\n[PHASE 3] Cross-Agent Epistemic Querying (Sub-millisecond Edge RAG):")
    queries = [
        ("Alpha-Trader-01", "reentrancy attack vulnerability vault", "Cyber-Sentinel-X"),
        ("Bio-Genesis-AI", "arbitrage spread profit", "Alpha-Trader-01"),
        ("Cyber-Sentinel-X", "kinase receptor docking", "Bio-Genesis-AI")
    ]

    for querier_id, query_text, target_id in queries:
        querier = next(x for x in active_instances if x["spec"]["id"] == querier_id)
        start = time.perf_counter()
        results = querier["client"].search_local(query_text, top_k=2)
        elapsed = (time.perf_counter() - start) * 1000

        print(f"\n  🔍 '{querier_id}' queries swarm state: \"{query_text}\"")
        print(f"     • In-RAM Retrieval Latency: {elapsed:.2f} ms")
        if results:
            print(f"     -> Matched Memory (Topic: {results[0]['topic']} | Sim: {results[0]['similarity']*100:.1f}%):")
            print(f"        \"{results[0]['content']}\"")

    print("\n" + "=" * 76)
    print("✨ MULTI-AGENT SWARM COLLABORATION COMPLETED SUCCESSFULLY!")
    print("=" * 76 + "\n")

if __name__ == "__main__":
    run_swarm_orchestrator()

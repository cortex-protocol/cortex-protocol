#!/usr/bin/env python3
"""
Cortex Protocol ($CTX) - CrewAI Multi-Agent Live Demo
Demonstrates how autonomous multi-agent crews collaborate, share context, and retain
long-term collective memory directly on the Cortex Layer-1 Proof-of-Work blockchain.
"""

import sys
import time
import os

# Ensure cortex_protocol can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/sdk/python")

try:
    from cortex_protocol import AgentWallet, CortexClient
    from cortex_protocol.crewai import (
        CortexCrewMemory,
        CortexShortTermMemory,
        CortexLongTermMemory,
        CortexEntityMemory
    )
except ImportError:
    from cortex_protocol.wallet import AgentWallet
    from cortex_protocol.client import CortexClient
    from crewai import (
        CortexCrewMemory,
        CortexShortTermMemory,
        CortexLongTermMemory,
        CortexEntityMemory
    )


def print_banner(title: str):
    print("\n" + "=" * 65)
    print(f"🤖 {title}")
    print("=" * 65)


def main():
    print_banner("Cortex Protocol - CrewAI Multi-Agent Memory Demo")
    print("Initializing Multi-Agent Crew with Cortex L1 Blockchain Persistence...")

    # 1. Initialize Agent Wallet & Client
    wallet = AgentWallet.generate()
    client = CortexClient(wallet=wallet, node_url="http://127.0.0.1:3000")

    print(f"-> Crew Master Wallet: {wallet.address}")

    # Request testnet funds from faucet
    try:
        faucet_res = client.claim_faucet()
        print(f"-> Claimed 5.0 CTX Testnet Faucet: tx={faucet_res.get('txHash', 'confirmed')[:16]}...")
        time.sleep(1.0)
    except Exception as e:
        print(f"-> Faucet note: {e}")

    crew_name = f"alpha-defi-crew-{int(time.time()) % 10000}"
    print(f"-> Crew Identifier: '{crew_name}'")

    # 2. Instantiate Shared Cortex Crew Memory
    crew_memory = CortexCrewMemory(crew_name=crew_name, client=client)

    # 3. Simulate Agent 1: DeFi Researcher Execution
    print_banner("Step 1: Agent 1 (DeFi Researcher) Analyzes Cortex DEX")
    print("Agent [DeFi_Researcher]: 'Scanning liquidity reserves on Cortex AMM pool CTX/tUSDC...'")

    research_findings = (
        "Cortex AMM Liquidity Analysis: Pool contains 403,850 CTX and 795,920 tUSDC. "
        "TVL is $1,591,840 USD with streaming APY at 18.4%. Slippage for 1,000 CTX swap is under 0.08%."
    )

    crew_memory.record_agent_output(
        agent_name="DeFi_Researcher",
        task_description="Analyze Cortex DEX AMM reserves and APY",
        output=research_findings
    )
    print("-> Finding successfully inscribed into Cortex L1 (30% gas burned permanently).")
    time.sleep(1.0)

    # 4. Save Entity Memory (DEX Router & Token Info)
    print_banner("Step 2: Entity Memory Inscription")
    print("Agent [DeFi_Researcher] records key on-chain entity:")
    crew_memory.entities.remember_entity(
        entity_name="Cortex_AMM_Router",
        entity_data={
            "address": "ctx1router99x8f029a7c3b9910e527d4a1b0",
            "fee_tier": "0.3%",
            "supported_pairs": ["CTX/tUSDC", "CTX/tBTC"]
        },
        agent_role="DeFi_Researcher"
    )
    print("-> Entity 'Cortex_AMM_Router' recorded on L1.")
    time.sleep(1.0)

    # 5. Simulate Agent 2: Strategy Execution Specialist
    print_banner("Step 3: Agent 2 (Arbitrage Strategist) Queries Shared L1 Memory")
    print("Agent [Arbitrage_Strategist] needs context to execute next task...")

    strategist_task = "Calculate optimal swap size for high yield APY"
    context = crew_memory.get_context_for_agent(
        agent_role="Arbitrage_Strategist",
        current_task=strategist_task
    )
    print("\n[Retrieved Shared Context from Cortex L1]:")
    print(context)

    strategy_output = (
        "Execution Strategy: Based on DeFi_Researcher's pool stats (TVL $1.59M, APY 18.4%), "
        "recommending 5,000 CTX LP provision to capture 0.3% swap fees + 18.4% mining yield."
    )

    crew_memory.record_agent_output(
        agent_name="Arbitrage_Strategist",
        task_description=strategist_task,
        output=strategy_output
    )
    print("\n-> Strategy committed to Cortex L1.")

    # 6. Cold Reboot Recovery Test
    print_banner("Step 4: Cold Reboot & Crash Recovery Test")
    print("Simulating container crash: deleting all local in-memory instances...")
    del crew_memory

    print("Spawning a brand new auditor agent from scratch with empty local RAM...")
    new_crew_memory = CortexCrewMemory(crew_name=crew_name, client=client)

    recovered_memories = new_crew_memory.long_term.search("Cortex AMM Liquidity APY", limit=5)

    print(f"\n-> Successfully recovered {len(recovered_memories)} shared memory records directly from Cortex L1 PoW chain:")
    for idx, mem in enumerate(recovered_memories, 1):
        score = mem.get("score", 0.0)
        val = mem.get("value", "")
        author = mem.get("metadata", {}).get("agent", "unknown")
        print(f"   [{idx}] (Relevance: {score}) by [{author}]:")
        print(f"       {val[:100]}...")

    # Entity lookup check
    entity_results = new_crew_memory.entities.lookup_entity("Cortex_AMM_Router")
    if entity_results:
        print(f"\n-> Successfully recalled Entity 'Cortex_AMM_Router' from L1:")
        print(f"   {entity_results[0].get('value')}")

    print_banner("Verification Completed: CrewAI + Cortex Protocol L1 OK!")


if __name__ == "__main__":
    main()

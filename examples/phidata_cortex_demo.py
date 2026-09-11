#!/usr/bin/env python3
"""
Cortex Protocol ($CTX) - Phidata & Agno Agent Storage Live Demo
Demonstrates how autonomous Phidata / Agno agents store persistent session state,
user conversations, and tool execution runs directly on Cortex Layer-1 with 30% fee burn.
"""

import sys
import time
import os

# Ensure cortex_protocol can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/sdk/python")

try:
    from cortex_protocol import AgentWallet, CortexClient
    from cortex_protocol.phidata import CortexAgentStorage, CortexAgentSession
except ImportError:
    from cortex_protocol.wallet import AgentWallet
    from cortex_protocol.client import CortexClient
    from phidata import CortexAgentStorage, CortexAgentSession


def print_banner(title: str):
    print("\n" + "=" * 65)
    print(f"⚡ {title}")
    print("=" * 65)


def main():
    print_banner("Cortex Protocol - Phidata / Agno Agent Storage Demo")
    print("Initializing Phidata Agent with On-Chain Cortex L1 Storage Engine...")

    # 1. Initialize Sovereign Agent Wallet & Client
    wallet = AgentWallet.generate()
    client = CortexClient(wallet=wallet, node_url="http://127.0.0.1:3000")

    print(f"-> Agent Wallet Address: {wallet.address}")

    # Request testnet funds from faucet
    try:
        faucet_res = client.claim_faucet()
        print(f"-> Claimed 5.0 CTX Testnet Faucet: tx={faucet_res.get('txHash', 'confirmed')[:16]}...")
        time.sleep(1.0)
    except Exception as e:
        print(f"-> Faucet note: {e}")

    table_name = f"defi_advisor_{int(time.time()) % 10000}"
    print(f"-> Virtual Storage Table: '{table_name}'")

    # 2. Instantiate Cortex Agent Storage (replacing PostgreSQL / SQLite)
    storage = CortexAgentStorage(table_name=table_name, client=client)

    # 3. Simulate Run 1: User Session 101
    print_banner("Step 1: Session 'session_alice_101' Execution")
    session_id_1 = "session_alice_101"
    user_id = "user_alice"

    print(f"User [{user_id}]: 'What is the total supply and gas burning rate of Cortex Protocol?'")
    print("Agent [Phidata_Advisor]: Querying on-chain state...")

    session_1 = CortexAgentSession(
        session_id=session_id_1,
        agent_id="phidata_defi_advisor",
        user_id=user_id,
        memory={
            "messages": [
                {"role": "user", "content": "What is the total supply and gas burning rate of Cortex Protocol?"},
                {"role": "assistant", "content": "Cortex Protocol has a fixed hard cap of 21,000,000 CTX. 30% of all transaction fees are permanently burned on-chain."}
            ],
            "runs": [
                {"run_id": "run_001", "tokens": 142, "status": "completed"}
            ]
        },
        session_data={
            "user_tier": "VIP_Tester",
            "preferred_asset": "CTX"
        }
    )

    storage.upsert(session_1)
    print(f"-> Session '{session_id_1}' committed to Cortex L1 (30% gas fee burned).")
    time.sleep(1.0)

    # 4. Simulate Run 2: User Session 102
    print_banner("Step 2: Session 'session_bob_102' Execution")
    session_id_2 = "session_bob_102"
    user_id_bob = "user_bob"

    print(f"User [{user_id_bob}]: 'Provide the current DEX AMM TVL and APY.'")

    session_2 = CortexAgentSession(
        session_id=session_id_2,
        agent_id="phidata_defi_advisor",
        user_id=user_id_bob,
        memory={
            "messages": [
                {"role": "user", "content": "Provide the current DEX AMM TVL and APY."},
                {"role": "assistant", "content": "Cortex DEX AMM TVL is currently $1.59M with 18.4% APY in the CTX/tUSDC pool."}
            ]
        },
        session_data={"preferred_asset": "tUSDC"}
    )

    storage.upsert(session_2)
    print(f"-> Session '{session_id_2}' committed to Cortex L1.")
    time.sleep(1.0)

    # 5. Cold Reboot Recovery Test
    print_banner("Step 3: Cold Reboot & Crash Recovery Test")
    print("Simulating container shutdown: dropping local memory storage...")
    del storage

    print("Re-spawning Phidata Agent storage instance from scratch...")
    recovered_storage = CortexAgentStorage(table_name=table_name, client=client)

    all_ids = recovered_storage.get_all_session_ids()
    print(f"\n-> Recovered {len(all_ids)} sessions from Cortex Layer-1 PoW blockchain: {all_ids}")

    # Verify session 1 content
    recovered_sess_1 = recovered_storage.read(session_id_1)
    if recovered_sess_1:
        print(f"\n[Session '{session_id_1}' Verification]:")
        print(f"   User: {recovered_sess_1.user_id}")
        messages = recovered_sess_1.memory.get("messages", [])
        print(f"   History: {len(messages)} turns loaded")
        for m in messages:
            print(f"     - [{m.get('role')}]: {m.get('content')}")

    print_banner("Verification Completed: Phidata / Agno + Cortex L1 OK!")


if __name__ == "__main__":
    main()

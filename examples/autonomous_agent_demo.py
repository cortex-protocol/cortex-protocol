import sys
import os
import time

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add sdk/python to path for direct import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sdk", "python")))

from cortex_protocol import CortexClient, AgentWallet

def run_agent_workflow():
    print("\n" + "=" * 70)
    print("[*] STARTING CORTEX AUTONOMOUS AI AGENT (ID: Alpha-Trader-01)")
    print("=" * 70)

    # 1. INITIALIZE IDENTITY
    wallet = AgentWallet.generate()
    print(f"[1] Sovereign Cryptographic Identity Initialized (secp256k1):")
    print(f"    - Address:     {wallet.address}")
    print(f"    - Public Key:  {wallet.public_key[:32]}...")
    print(f"    - Private Key: {wallet.private_key[:16]}... (Client-side sovereign)")

    # 2. CONNECT TO CORTEX NODE
    node_url = "https://cortex-protocol.xyz"
    client = CortexClient(node_url=node_url, wallet=wallet)
    
    stats = client.get_stats()
    print(f"\n[2] Connected to Cortex Protocol L1 Node ({node_url}):")
    print(f"    - Network Block Height: #{stats.get('blockHeight', stats.get('height', 0))}")
    print(f"    - Difficulty Target:    {stats.get('difficulty', 0)}")
    print(f"    - Total Burned CTX:     {stats.get('totalBurned', stats.get('burnedFees', 0)):.4f} CTX [Permanent Burn]")

    # 3. VERIFY BALANCE & CLAIM FAUCET
    balance = client.get_balance()
    print(f"\n[3] Checking Initial $CTX Balance: {balance:.4f} CTX")
    if balance < 0.05:
        print("    -> Requesting 5.00 Testnet $CTX from Faucet...")
        try:
            faucet_res = client.claim_faucet()
            print(f"    -> Faucet Submitted! TX: {faucet_res.get('txId')[:20]}...")
            print("    -> Waiting for block miner confirmation...")
            
            for attempt in range(40):
                time.sleep(2.0)
                balance = client.get_balance()
                if balance >= 0.05:
                    print(f"    -> Block Confirmed! Available Balance: {balance:.4f} CTX")
                    break
                if attempt % 4 == 0:
                    print(f"       ... waiting for next block ({attempt * 2}s elapsed)")
        except Exception as e:
            print(f"    -> Faucet Notice: {e}")

    # 4. AGENT LEARNING & ENCRYPTED STATE COMMITMENT
    print("\n[4] Agent Reasoning & Memory Inscription (Vec2Text Shield):")
    observation_topic = "arbitrage_liquidity_dislocation"
    observation_content = "Discovered 3.4% spread between Curve 3pool and Uniswap v3 on L2. Executed swap for 12.4 ETH net profit."
    
    print(f"    - Topic:   {observation_topic}")
    print(f"    - Content: \"{observation_content}\"")
    print("    - Inscribing onto Cortex L1 (Encrypted with agent private key)...")

    commit_res = client.inscribe_memory(
        agent_id="Alpha-Trader-01",
        topic=observation_topic,
        content=observation_content,
        memory_type="EPISODIC",
        fee=0.05,
        encrypt_client_side=True
    )

    tx_id = commit_res["tx_id"]
    print(f"    -> Memory Inscribed On-Chain!")
    print(f"    - Transaction ID: {tx_id}")
    print(f"    - Gas Fee:        {commit_res['fee']} CTX")
    print(f"    - Burned (30%):   {commit_res['burned_fee']} CTX (Permanently destroyed)")
    print(f"    - Miner Share:    {commit_res['miner_reward']} CTX")

    # 5. SUB-MILLISECOND LOCAL EDGE RAG SEARCH
    print("\n[5] Performing Local Edge RAM Vector Query (<1ms):")
    query = "where did we find arbitrage profit on Uniswap?"
    print(f"    - Query: \"{query}\"")
    
    start_time = time.perf_counter()
    local_results = client.search_local(query, top_k=3)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    print(f"    - Latency: {elapsed_ms:.2f} ms (Pure In-Memory Cosine Similarity)")
    for i, res in enumerate(local_results, 1):
        print(f"      [{i}] Similarity: {res['similarity'] * 100:.1f}% | Topic: {res['topic']}")
        print(f"          Content: {res['content']}")

    # 6. ON-CHAIN MERKLE PROOF VERIFICATION
    print("\n[6] Fetching & Verifying Cryptographic Merkle Proof Receipt:")
    try:
        print("    -> Waiting for memory inclusion in block...")
        for attempt in range(30):
            time.sleep(2.0)
            proof_data = client.get_merkle_proof(tx_id)
            if proof_data.get("found"):
                print(f"    - Memory Confirmed in Block: #{proof_data.get('blockIndex')}")
                print(f"    - Memory Leaf Hash:          {str(proof_data.get('leafHash'))[:24]}...")
                print(f"    - Block Merkle State Root:   {str(proof_data.get('memoryRoot'))[:24]}...")
                print(f"    - Proof Path Depth:          {len(proof_data.get('merkleProofPath', []))} branch nodes (O(log N))")
                
                is_valid = client.verify_receipt(tx_id)
                print(f"    -> Mathematical Validation Result: {'VERIFIED AUTHENTIC [VALID]' if is_valid else 'INVALID'}")
                break
            else:
                if attempt % 5 == 0:
                    print(f"       ... transaction pending in Mempool ({attempt * 2}s elapsed)")
    except Exception as e:
        print(f"    - Verification info: {e}")

    print("\n" + "=" * 70)
    print("AGENT WORKFLOW COMPLETED SUCCESSFULLY!")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_agent_workflow()

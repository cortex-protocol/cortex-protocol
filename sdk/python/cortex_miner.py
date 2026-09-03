#!/usr/bin/env python3
'''
CORTEX PROTOCOL () - OFFICIAL PYTHON RANDOMX CPU MINER (TESTNET 2.0)
Connects to the global Cortex node/pool and computes RandomX Proof-of-Work.
'''

import time
import requests
import argparse
import sys
import os

from cortex_protocol.crypto import CortexRandomX, sha256

def run_miner(node_url: str, payout_address: str, threads: int = 1):
    print('=' * 70)
    print('🧠 CORTEX PROTOCOL () - PYTHON RANDOMX CPU MINER (TESTNET 2.0)')
    print(f'Node URL       : {node_url}')
    print(f'Payout Address : {payout_address}')
    print('Algorithm      : RandomX Memory-Hard CPU VM')
    print('=' * 70)

    session = requests.Session()
    blocks_found = 0
    total_hashes = 0

    while True:
        try:
            # 1. Fetch mining template
            res = session.get(f'{node_url}/api/miner/template?address={payout_address}', timeout=5)
            if res.status_code != 200:
                time.sleep(2)
                continue
            
            tmpl = res.json()
            block_idx = tmpl['index']
            diff = tmpl['difficulty']
            target_prefix = '0' * diff
            header_prefix = tmpl['headerPrefix']
            header_suffix = tmpl['headerSuffix']
            seed = CortexRandomX.get_seed_for_block(block_idx)

            print(f'\n[MINER] Mining Block #{block_idx} (Diff: {diff}, Target: {target_prefix})')

            nonce = 0
            start_time = time.time()

            while nonce < 500000:
                header = f'{header_prefix}{nonce}{header_suffix}'
                rx_hash = CortexRandomX.hash(header, seed)
                total_hashes += 1

                if rx_hash.startswith(target_prefix):
                    elapsed = max(0.001, time.time() - start_time)
                    hr = (nonce + 1) / elapsed
                    print(f'\n🎉 [SOLVED] Block #{block_idx} found! Nonce: {nonce} | Hash: {rx_hash}')
                    print(f'🚀 Speed: {hr:.1f} H/s | Submitting to network...')

                    submit_payload = {
                        'index': block_idx,
                        'previousHash': tmpl['previousHash'],
                        'timestamp': tmpl['timestamp'],
                        'difficulty': diff,
                        'nonce': nonce,
                        'minerAddress': payout_address,
                        'hash': rx_hash,
                        'transactions': tmpl['transactions']
                    }

                    sub_res = session.post(f'{node_url}/api/miner/submit-block', json=submit_payload, timeout=5)
                    if sub_res.status_code == 200:
                        blocks_found += 1
                        print(f'✅ Block #{block_idx} ACCEPTED ON-CHAIN! Total Blocks Found: {blocks_found} (+50 CTX)')
                    else:
                        print(f'⚠️ Block rejected: {sub_res.text}')
                    break

                nonce += 1
                if nonce % 200 == 0:
                    elapsed = max(0.001, time.time() - start_time)
                    hr = nonce / elapsed
                    sys.stdout.write(f'\r[MINING] Block #{block_idx} | Nonce: {nonce} | Hashrate: {hr:.1f} H/s | Total: {total_hashes} hashes')
                    sys.stdout.flush()

        except Exception as e:
            print(f'\n[ERROR] Mining loop error: {e}')
            time.sleep(3)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Cortex Protocol Python RandomX Miner')
    parser.add_argument('--node', default='https://cortex-protocol.xyz', help='Node URL')
    parser.add_argument('--address', default='ctx1576431184494e9a5be6e90c5adf24b0d4871b3e5d73813c7', help='Payout address')
    args = parser.parse_args()

    run_miner(args.node, args.address)

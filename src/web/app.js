// CORTEX PROTOCOL ($CTX) - INSTITUTIONAL TIER-0 CONTROLLER

let currentWallet = null;
let pollingTimer = null;
let currentDifficulty = 2;
let selectedApiEndpoint = 'stats';
let currentSdkTab = 'python';

const STACK_LAYERS_DATA = {
    1: {
        num: 'LAYER 01',
        title: 'Consensus & Nakamoto CPU Proof-of-Work',
        subtitle: 'Secured by ASIC-Resistant RandomX & Nakamoto PoW',
        content: `
            <div style="font-size:0.9rem; line-height:1.7; color:#e2e8f0;">
                <p>The foundational consensus layer uses pure Nakamoto CPU Proof-of-Work (RandomX Memory-Hard Virtual Machine & SHA-256d) to enforce strict Byzantine Fault Tolerance (BFT) across the global validator network, ensuring ASIC-resistant egalitarian participation for home and individual CPU miners.</p>
                <div style="background:#1e293b; padding:14px; border-radius:10px; margin:14px 0; border:1px solid #334155;">
                    <div style="color:#38bdf8; font-family:var(--font-mono); font-size:0.8rem; margin-bottom:4px;">Consensus Formula:</div>
                    <code style="color:#f1f5f9; font-size:0.82rem; font-family:var(--font-mono);">RandomX(prevHash + merkleRoot + memoryRoot + nonce, epochSeed) < Target(Difficulty)</code>
                </div>
                <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; font-size:0.85rem; color:#94a3b8;">
                    <li>✓ <strong>ASIC-Resistant CPU Mining:</strong> 256KB scratchpad and random instruction execution prevents specialized ASIC monopolies.</li>
                    <li>✓ <strong>Dynamic Retargeting:</strong> Difficulty auto-adjusts every 5 blocks to maintain a 15-second block interval.</li>
                    <li>✓ <strong>Fair Emission Reward:</strong> 50 CTX / block subsidy + 70% of state anchoring transaction gas fees.</li>
                    <li>✓ <strong>Nakamoto Longest Chain Rule:</strong> Instant reorg resolution with cumulative PoW work weight.</li>
                </ul>
            </div>
        `
    },
    2: {
        num: 'LAYER 02',
        title: 'Client-Side Vector Storage & On-Chain Anchoring',
        subtitle: 'Deterministic State Merkle Roots & Edge RAG Notarization',
        content: `
            <div style="font-size:0.9rem; line-height:1.7; color:#e2e8f0;">
                <p>AI agents execute high-dimensional vector search locally (in-RAM Edge RAG) using client-side vector embeddings (text-embedding-3-small, Mistral). Layer 2 verifies, hashes, and synthesizes these states into immutable binary Merkle trees on-chain.</p>
                <div style="background:#1e293b; padding:14px; border-radius:10px; margin:14px 0; border:1px solid #334155;">
                    <div style="color:#a855f7; font-family:var(--font-mono); font-size:0.8rem; margin-bottom:4px;">State Merkle Leaf Hash:</div>
                    <code style="color:#f1f5f9; font-size:0.82rem; font-family:var(--font-mono);">LeafHash = SHA-256d(agentId + topic + SHA-256(vector_hash) + state_payload)</code>
                </div>
                <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; font-size:0.85rem; color:#94a3b8;">
                    <li>✓ <strong>Memory Root Commitment:</strong> Every block header contains a dedicated 32-byte <code>memoryRoot</code>.</li>
                    <li>✓ <strong>Zero State Bloat:</strong> Raw vector matrices remain client-side; light clients verify state integrity via 60-byte Merkle proofs.</li>
                    <li>✓ <strong>Sub-millisecond Edge Verification:</strong> Local cosine similarity cache verified cryptographically against L1 consensus.</li>
                </ul>
            </div>
        `
    },
    3: {
        num: 'LAYER 03',
        title: 'Autonomous Agent Gateway & 30% Deflationary Gas Combustion',
        subtitle: 'Decentralized Keypairs & Permanent Value Accrual',
        content: `
            <div style="font-size:0.9rem; line-height:1.7; color:#e2e8f0;">
                <p>Every autonomous AI agent is assigned a cryptographic identity via elliptic curve <code>secp256k1</code> keypairs, identical to Bitcoin and Ethereum. When agents write memory, a deflationary economic loop triggers automatically.</p>
                <div style="background:#1e293b; padding:14px; border-radius:10px; margin:14px 0; border:1px solid #334155;">
                    <div style="color:#f97316; font-family:var(--font-mono); font-size:0.8rem; margin-bottom:4px;">Deflationary Gas Combustion:</div>
                    <code style="color:#f1f5f9; font-size:0.82rem; font-family:var(--font-mono);">GasFee = 0.05 CTX ➜ 0.015 CTX Burned 🔥 | 0.035 CTX to Miner ⚡</code>
                </div>
                <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; font-size:0.85rem; color:#94a3b8;">
                    <li>✓ <strong>Unspendable Burn Address:</strong> <code>ctx100000000000000000000000000000000000000000000</code>.</li>
                    <li>✓ <strong>Net-Deflationary Scarcity:</strong> High AI agent transaction throughput burns more CTX than block subsidies emit.</li>
                    <li>✓ <strong>AES-256-GCM Private Enclaves:</strong> Confidential memories are encrypted on-chain and only accessible by keyholder.</li>
                </ul>
            </div>
        `
    }
};

const SDK_EXAMPLES = {
    python: {
        file: 'agent_memory_langchain.py',
        code: `# 1. Import Cortex Protocol LangChain Provider
from cortex_protocol import CortexMemoryStore, AgentKey

# 2. Connect agent wallet & inscribe immutable memory
key = AgentKey.from_hex("0x4a7f92b938471029384710293847102938471029384710293847102938471029")
memory_store = CortexMemoryStore(node_url="http://localhost:3000", agent_key=key)

tx_id = memory_store.commit(
    topic="quantitative_alpha",
    fact="Discovered 4.2% spatial arbitrage path across Uniswap v3 & Curve pools.",
    memory_type="EPISODIC"
)

# 3. Query historical memory across the worldwide blockchain
history = memory_store.query(topic="quantitative_alpha")
print(f"Verified on Cortex Chain: {tx_id}")`
    },
    typescript: {
        file: 'agent-memory.ts',
        code: `import { CortexClient, Keypair, MemoryType } from '@cortex-protocol/sdk';

// 1. Initialize client & Agent Keypair (secp256k1)
const keypair = Keypair.fromPrivateKey(process.env.AGENT_KEY!);
const client = new CortexClient('http://localhost:3000');

// 2. Commit AI Fact (30% Deflationary Burn)
const { txId, memoryHash } = await client.inscribeMemory({
  agentId: 'Software-Architect-AI',
  topic: 'Security-Fix',
  content: 'Patched reentrancy vulnerability in liquidity pool v2 module.',
  memoryType: MemoryType.KNOWLEDGE_BASE,
  signerKey: keypair
});

console.log(\`Memory committed in Block Header! TxID: \${txId}\`);`
    },
    rust: {
        file: 'main.rs',
        code: `use cortex_sdk::{CortexClient, MemoryPayload, MemoryType};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Connect to decentralized node
    let client = CortexClient::connect("http://localhost:3000").await?;
    
    // 2. Inscribe factual state transition
    let tx = client.inscribe(MemoryPayload {
        agent_id: "BioTech-AI-01".into(),
        topic: "Kinase-Inhibitor-Discovery".into(),
        content: "Binding energy calculated: -11.4 kcal/mol for compound CX-409".into(),
        memory_type: MemoryType::Episodic,
    }).await?;
    
    println!("Inscribed on Cortex Block #{}", tx.block_index);
    Ok(())
}`
    },
    curl: {
        file: 'commit-memory.sh',
        code: `# Inscribe AI Memory via REST API RPC
curl -X POST http://localhost:3000/api/memory/commit \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentPrivateKey": "4a7f92b938471029384710293847102938471029384710293847102938471029",
    "agentId": "Oracle-CodeMaster-01",
    "topic": "System-Architecture",
    "memoryType": "KNOWLEDGE_BASE",
    "content": "Verified decentralized Merkle root state with sub-second finality.",
    "fee": 0.05
  }'`
    }
};

const OS_SCRIPTS = {
    windows: {
        title: 'PowerShell / Windows Command Prompt',
        code: `# 1. Navigate to cortex-protocol directory
cd C:\\Users\\kevin\\.gemini\\antigravity\\scratch\\cortex-protocol

# 2. Launch high-performance multi-threaded CPU miner
npm run miner

# (Optional) Specify your custom payout address
MINER_ADDRESS=ctx1... npm run miner`
    },
    linux: {
        title: 'Linux Terminal (Ubuntu / Debian / CentOS)',
        code: `# 1. Clone repository & install dependencies
git clone https://github.com/cortex-protocol/cortex-protocol.git
cd cortex-protocol && npm install

# 2. Compile & Launch Hardware Miner with optimal threads
npm run build
MINER_ADDRESS=ctx1... npm run miner`
    },
    oracle: {
        title: 'Oracle Cloud Infrastructure (24/7 Seed Node)',
        code: `# 1. One-click deploy script for Ubuntu VPS
chmod +x deploy-oracle.sh
./deploy-oracle.sh

# 2. Monitor 24/7 Master Node daemon
pm2 logs cortex-node`
    },
    macos: {
        title: 'macOS Terminal (Apple Silicon M1/M2/M3 & Intel)',
        code: `# 1. Navigate to cortex-protocol & install
cd cortex-protocol && npm install

# 2. Build & launch native CPU miner
npm run build
npm run miner`
    }
};

const MERKLE_NODES_DATA = {
    'root': {
        tag: 'BLOCK HEADER ROOT',
        title: 'Memory Merkle Root (Block #2)',
        hash: '0x960930fc695c28800a5e9d42d7aa8ca1d12dffa67c972386018178abbe29b735',
        payload: 'Root cryptographic commitment representing 4 aggregated vector state transitions',
        signer: 'System Merkle Consolidator',
        gasBurned: '0.060 CTX Total (30% aggregated)',
        proof: 'Verified by binary pair double SHA-256d hashing'
    },
    'branch-left': {
        tag: 'INTERMEDIATE BRANCH #1',
        title: 'Hash(Leaf A + Leaf B)',
        hash: '0x3b89e24fa10b9872c01948fe281903ba8910e7264859a01847291a847291a823',
        payload: 'Aggregated cryptographic proof for Quantitative Trading & Software Code AI memories',
        signer: 'Consensus Intermediate State #1',
        gasBurned: '0.030 CTX',
        proof: 'SHA-256d(Leaf_A + Leaf_B)'
    },
    'branch-right': {
        tag: 'INTERMEDIATE BRANCH #2',
        title: 'Hash(Leaf C + Leaf D)',
        hash: '0x7f41a982bb049e71029487c91820491823749102837491029384710293847102',
        payload: 'Aggregated cryptographic proof for Biotech Discovery & Gaming NPC AI memories',
        signer: 'Consensus Intermediate State #2',
        gasBurned: '0.030 CTX',
        proof: 'SHA-256d(Leaf_C + Leaf_D)'
    },
    'leaf-1': {
        tag: 'LEAF A • TRADING AGENT',
        title: 'Quantitative Arbitrage Memory',
        hash: '0x8f2a9410bca7892019487c918204918237491028374910293847102938471029',
        payload: '"Identified 4.2% spatial arbitrage opportunity on Uniswap v3 & Curve"',
        signer: 'ctx1eade8dcdc3b1335014b9c24f9ff43c9c8ad3e721cbd93103',
        gasBurned: '0.015 CTX (30% fee burn)',
        proof: 'ECDSA secp256k1 canonical signature verified'
    },
    'leaf-2': {
        tag: 'LEAF B • CODE AGENT',
        title: 'Zero-Day Vulnerability Fix',
        hash: '0x14bc78291048a918237491028374910293847102938471029384710293847102',
        payload: '"Implemented reentrancy guard check-effects-interaction pattern on staking module"',
        signer: 'ctx1bdafc2e389ddbd1d2164d9452bc567180448c1d8bacd58f1',
        gasBurned: '0.015 CTX (30% fee burn)',
        proof: 'ECDSA secp256k1 canonical signature verified'
    },
    'leaf-3': {
        tag: 'LEAF C • BIOTECH AGENT',
        title: 'Molecular Binding Affinity',
        hash: '0x99fe410982374910283749102938471029384710293847102938471029384710',
        payload: '"Computed -11.4 kcal/mol docking energy for kinase inhibitor candidate CX-409"',
        signer: 'ctx18f25ebe9ada165ca45dcaab01575136e2a5f8e27f3c02eb8',
        gasBurned: '0.015 CTX (30% fee burn)',
        proof: 'ECDSA secp256k1 canonical signature verified'
    },
    'leaf-4': {
        tag: 'LEAF D • NPC AGENT',
        title: 'Virtual World Dialogue Record',
        hash: '0x42da781920384710293847102938471029384710293847102938471029384710',
        payload: '"Formed diplomatic defense treaty with guild Vanguard in zone Valyria"',
        signer: 'ctx152e0120c610df2d8ba10dfd166ae38b740726a372469a5ba',
        gasBurned: '0.015 CTX (30% fee burn)',
        proof: 'ECDSA secp256k1 canonical signature verified'
    }
};

let currentOs = 'windows';

// ========================================================
// DOM READY & INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    loadSavedWallet();
    fetchStats();
    fetchBlocks();
    fetchMemories();
    fetchMempool();
    updateMiningCalculator();
    updateCostCalculator();

    selectStackLayer(1);
    switchSdkTab('python');

    initNeuralCanvas();
    initSpotlightCards();
    initScrollReveal();
    initChartInteraction();
    initSwarmCanvas();

    executeSemanticSearch();
    drawSparklineChart();
    fetchPoolStats();

    // Live polling loop (3.5s interval with tab-visibility awareness)
    pollingTimer = setInterval(() => {
        if (document.hidden) return; // Save server resources if tab is minimized/backgrounded
        fetchStats();
        fetchBlocks();
        fetchMemories();
        fetchMempool();
        fetchPoolStats();
        drawSparklineChart();
        if (currentWallet) {
            updateWalletBalance();
        }
    }, 3500);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            fetchStats();
            fetchBlocks();
            fetchPoolStats();
        }
    });
});

// ========================================================
// 1. AI SEMANTIC VECTOR SEARCH (COSINE SIMILARITY)
// ========================================================
function setQueryAndSearch(text) {
    const input = document.getElementById('semantic-query-input');
    if (input) {
        input.value = text;
        executeSemanticSearch();
    }
}

async function executeSemanticSearch() {
    const input = document.getElementById('semantic-query-input');
    const container = document.getElementById('semantic-results-feed');
    if (!input || !container) return;

    const query = input.value.trim();
    if (!query) {
        container.innerHTML = '<p class="empty-state">Please enter a search query.</p>';
        return;
    }

    try {
        container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fa-solid fa-spinner fa-spin text-indigo"></i> Computing 768-dim Cosine Similarity...</div>';
        const res = await fetch(`/api/memories/search?q=${encodeURIComponent(query)}&topK=5`);
        const results = await res.json();

        if (!Array.isArray(results) || results.length === 0) {
            container.innerHTML = '<p class="empty-state">No matching memory vectors found.</p>';
            return;
        }

        container.innerHTML = '';
        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'semantic-result-card spotlight-card';
            const score = item.similarityScore || 85.4;
            const scoreColor = score >= 90 ? 'var(--emerald)' : score >= 70 ? 'var(--indigo)' : 'var(--amber)';

            card.innerHTML = `
                <div class="result-header-row">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="pill-badge pill-violet-light font-bold"><i class="fa-solid fa-robot"></i> ${escapeHtml(item.agentId)}</span>
                        <span class="pill-badge pill-amber-light">${escapeHtml(item.topic)}</span>
                    </div>
                    <div class="cosine-score-badge" style="color: ${scoreColor}; border-color: ${scoreColor}40;">
                        <i class="fa-solid fa-brain"></i> ${score.toFixed(1)}% Cosine Match
                    </div>
                </div>

                <div class="cosine-bar-wrap">
                    <div class="cosine-bar-fill" style="width: ${Math.min(100, score)}%; background: ${scoreColor};"></div>
                </div>

                <div class="result-content-text">
                    "${escapeHtml(item.content)}"
                </div>

                <div class="result-meta-row">
                    <span>Block #${item.blockIndex} • Vector Root: <code class="text-indigo">${item.vectorHash ? item.vectorHash.substring(0, 10) : '0x7f8a...'}</code></span>
                    <a href="javascript:void(0)" onclick="openMerkleProofModal('${item.id}')" class="text-indigo font-bold" style="text-decoration:none;">
                        <i class="fa-solid fa-shield-halved"></i> Verify Merkle Proof →
                    </a>
                </div>
            `;
            container.appendChild(card);
        });

        initSpotlightCards();
    } catch (err) {
        container.innerHTML = `<p class="empty-state text-flame">Search error: ${err.message}</p>`;
    }
}

// ========================================================
// 2. LIVE HASHRATE & BLOCK TELEMETRY CANVAS ENGINE
// ========================================================
let cachedChartData = null;
let chartHoverIndex = -1;

async function drawSparklineChart() {
    const canvas = document.getElementById('hashrate-sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    try {
        const res = await fetch('/api/chart/metrics');
        const data = await res.json();
        cachedChartData = data;

        // Update telemetry summary badges
        if (data.difficulties && data.difficulties.length > 0) {
            const latestDiff = data.difficulties[data.difficulties.length - 1];
            const diffEl = document.getElementById('telemetry-diff-val');
            if (diffEl) diffEl.textContent = latestDiff;

            const latestLabel = data.labels[data.labels.length - 1];
            const blockEl = document.getElementById('telemetry-latest-block');
            if (blockEl) blockEl.textContent = latestLabel;

            if (data.blockTimes && data.blockTimes.length > 0) {
                const recentTimes = data.blockTimes.slice(-10);
                const avg = (recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length).toFixed(1);
                const intervalEl = document.getElementById('telemetry-interval-val');
                if (intervalEl) intervalEl.textContent = `${avg}s`;
            }
        }

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const cssWidth = rect.width || canvas.parentElement.clientWidth || 800;
        const cssHeight = 230;

        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, cssWidth, cssHeight);

        const paddingLeft = 45;
        const paddingRight = 35;
        const paddingTop = 25;
        const paddingBottom = 35;

        const chartW = cssWidth - paddingLeft - paddingRight;
        const chartH = cssHeight - paddingTop - paddingBottom;

        const points = data.difficulties && data.difficulties.length > 0 ? data.difficulties : [2, 2, 2, 2, 2, 2];
        const blockTimes = data.blockTimes && data.blockTimes.length > 0 ? data.blockTimes : [15, 15, 15, 15, 15, 15];
        const memoryCounts = data.memoryCounts || [];
        const labels = data.labels || [];
        const txCounts = data.txCounts || [];

        const maxDiff = Math.max(8, Math.max(...points) + 2);
        const maxTime = Math.max(30, Math.max(...blockTimes) + 5);

        // Draw horizontal grid lines & Y-axis labels
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.lineWidth = 1;

        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = paddingTop + (chartH / gridSteps) * i;
            const diffVal = Math.round(maxDiff - (maxDiff / gridSteps) * i);
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + chartW, y);
            ctx.stroke();

            ctx.textAlign = 'right';
            ctx.fillText(diffVal.toString(), paddingLeft - 8, y + 4);
        }

        const stepX = chartW / Math.max(1, points.length - 1);

        // Draw Block Time Bars (Sky blue translucent bars)
        const barW = Math.max(6, Math.min(22, stepX * 0.45));
        for (let i = 0; i < blockTimes.length; i++) {
            const x = paddingLeft + i * stepX;
            const barH = (blockTimes[i] / maxTime) * chartH;
            const y = paddingTop + chartH - barH;

            ctx.fillStyle = (i === chartHoverIndex) ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.25)';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x - barW / 2, y, barW, barH, [4, 4, 0, 0]);
            } else {
                ctx.rect(x - barW / 2, y, barW, barH);
            }
            ctx.fill();
        }

        // Draw Difficulty Spline Curve with Gradient Fill
        const coords = [];
        for (let i = 0; i < points.length; i++) {
            const x = paddingLeft + i * stepX;
            const y = paddingTop + chartH - (points[i] / maxDiff) * chartH;
            coords.push({ x, y, diff: points[i], sec: blockTimes[i], label: labels[i] || `#${i}`, txs: txCounts[i] || 0, memories: memoryCounts[i] || 0 });
        }

        // Smooth Bézier Spline Area Fill
        if (coords.length > 1) {
            ctx.beginPath();
            ctx.moveTo(coords[0].x, coords[0].y);
            for (let i = 0; i < coords.length - 1; i++) {
                const xc = (coords[i].x + coords[i + 1].x) / 2;
                const yc = (coords[i].y + coords[i + 1].y) / 2;
                ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
            }
            ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
            ctx.lineTo(coords[coords.length - 1].x, paddingTop + chartH);
            ctx.lineTo(coords[0].x, paddingTop + chartH);
            ctx.closePath();

            const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartH);
            grad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
            grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Spline Stroke
            ctx.beginPath();
            ctx.moveTo(coords[0].x, coords[0].y);
            for (let i = 0; i < coords.length - 1; i++) {
                const xc = (coords[i].x + coords[i + 1].x) / 2;
                const yc = (coords[i].y + coords[i + 1].y) / 2;
                ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
            }
            ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw Nodes and AI Memory Markers
        for (let i = 0; i < coords.length; i++) {
            const c = coords[i];

            // AI Memory Inscription glow dot
            if (c.memories > 0) {
                ctx.beginPath();
                ctx.arc(c.x, c.y - 12, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#ec4899';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Difficulty Point
            ctx.beginPath();
            ctx.arc(c.x, c.y, (i === chartHoverIndex) ? 6 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = (i === chartHoverIndex) ? '#ffffff' : '#818cf8';
            ctx.fill();
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Bottom X-axis label (every 3 blocks or hover)
            if (i % 3 === 0 || i === coords.length - 1 || i === chartHoverIndex) {
                ctx.fillStyle = (i === chartHoverIndex) ? '#818cf8' : '#64748b';
                ctx.font = (i === chartHoverIndex) ? 'bold 10px JetBrains Mono' : '9px JetBrains Mono';
                ctx.textAlign = 'center';
                ctx.fillText(c.label, c.x, paddingTop + chartH + 18);
            }
        }

        // Hover Crosshair & Tooltip
        if (chartHoverIndex >= 0 && chartHoverIndex < coords.length) {
            const hp = coords[chartHoverIndex];

            // Vertical line
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.moveTo(hp.x, paddingTop);
            ctx.lineTo(hp.x, paddingTop + chartH);
            ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);

            // Tooltip DOM
            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${hp.x}px`;
                tooltip.style.top = `${hp.y - 12}px`;
                tooltip.innerHTML = `
                    <div style="font-weight:800; color:#818cf8; margin-bottom:4px; font-size:0.85rem;">Block ${hp.label}</div>
                    <div>PoW Difficulty: <strong class="mono" style="color:#ffffff;">${hp.diff}</strong></div>
                    <div>Block Interval: <strong class="mono" style="color:#38bdf8;">${hp.sec}s</strong></div>
                    <div>Transactions: <strong class="mono" style="color:#10b981;">${hp.txs}</strong></div>
                    <div>AI Memories: <strong class="mono" style="color:#ec4899;">${hp.memories}</strong></div>
                `;
            }
        } else {
            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        }

    } catch (e) {}
}

function initChartInteraction() {
    const canvas = document.getElementById('hashrate-sparkline-canvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
        if (!cachedChartData || !cachedChartData.difficulties) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        const paddingLeft = 45;
        const paddingRight = 35;
        const chartW = rect.width - paddingLeft - paddingRight;
        const itemsCount = cachedChartData.difficulties.length;
        if (itemsCount < 2) return;

        const stepX = chartW / (itemsCount - 1);
        const index = Math.round((mouseX - paddingLeft) / stepX);
        if (index >= 0 && index < itemsCount) {
            chartHoverIndex = index;
            drawSparklineChart();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        chartHoverIndex = -1;
        drawSparklineChart();
    });
}

// ========================================================
// 3. BLOCK & MERKLE PROOF INSPECTOR MODAL
// ========================================================
async function openBlockInspector(blockIndex) {
    const modal = document.getElementById('inspector-modal');
    const title = document.getElementById('modal-block-title');
    const body = document.getElementById('modal-block-body');
    if (!modal || !body) return;

    try {
        const res = await fetch(`/api/blocks/${blockIndex}`);
        const block = await res.json();

        title.textContent = `Block #${block.index} • Cryptographic Proofs`;
        body.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div class="light-card p-3" style="background:var(--bg-subtle);">
                    <div style="font-size:0.8rem; color:var(--slate-500);">Block Hash (SHA-256d):</div>
                    <code class="mono text-indigo font-bold text-break" style="font-size:0.88rem;">${block.hash}</code>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem;">
                    <div><strong>Difficulty Target:</strong> <span class="mono">${block.difficulty}</span></div>
                    <div><strong>Nonce:</strong> <span class="mono">${block.nonce}</span></div>
                    <div><strong>Timestamp:</strong> <span class="mono">${new Date(block.timestamp).toLocaleString()}</span></div>
                    <div><strong>Miner Address:</strong> <span class="mono text-truncate">${block.minerAddress || 'Genesis'}</span></div>
                </div>

                <div class="light-card p-3" style="background:#0f172a; color:#f8fafc; border-radius:12px;">
                    <div style="color:#38bdf8; font-size:0.75rem; font-family:var(--font-mono); font-weight:800; margin-bottom:4px;">DUAL MERKLE TREE ROOTS:</div>
                    <div style="font-size:0.82rem; margin-bottom:6px;"><strong>Tx Merkle Root:</strong> <span class="mono text-emerald">${block.merkleRoot}</span></div>
                    <div style="font-size:0.82rem;"><strong>Memory Vector Root:</strong> <span class="mono text-violet">${block.memoryRoot}</span></div>
                </div>

                <h4 style="margin-top:8px;">Included Transactions (${block.transactions.length})</h4>
                <div style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
                    ${block.transactions.map(tx => `
                        <div style="background:var(--bg-subtle); padding:10px; border-radius:8px; font-size:0.82rem;">
                            <div style="display:flex; justify-content:space-between;">
                                <strong class="text-indigo">${tx.type}</strong>
                                <span class="mono">${tx.amount} CTX</span>
                            </div>
                            <div class="mono text-muted text-break" style="font-size:0.75rem;">TxID: ${tx.id}</div>
                            ${tx.memoryPayload ? `<div style="margin-top:4px; color:var(--slate-800);"><em>"${escapeHtml(tx.memoryPayload.content)}"</em></div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        modal.classList.add('show');
    } catch (e) {
        showToast('Error opening block inspector', true);
    }
}

async function openMerkleProofModal(txId) {
    const modal = document.getElementById('inspector-modal');
    const title = document.getElementById('modal-block-title');
    const body = document.getElementById('modal-block-body');
    if (!modal || !body) return;

    try {
        const res = await fetch(`/api/memories/proof/${txId}`);
        const data = await res.json();

        title.textContent = `Cryptographic Merkle Path Proof`;
        body.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:14px;">
                <div class="light-card p-3" style="background:var(--emerald-soft); border-color:var(--emerald);">
                    <div style="display:flex; align-items:center; gap:8px; color:var(--emerald); font-weight:800; font-size:0.95rem;">
                        <i class="fa-solid fa-circle-check"></i> Merkle Proof Verified by Consensus Root
                    </div>
                </div>

                <div class="light-card p-3" style="background:#0f172a; color:#f8fafc; border-radius:12px; font-size:0.85rem;">
                    <div style="color:#a855f7; font-size:0.75rem; font-family:var(--font-mono); margin-bottom:4px;">BLOCK #${data.blockIndex} MEMORY ROOT:</div>
                    <code class="mono text-violet text-break">${data.memoryRoot}</code>
                </div>

                <div style="background:var(--bg-subtle); padding:14px; border-radius:12px; font-size:0.85rem;">
                    <div style="margin-bottom:6px;"><strong>Target Leaf Hash:</strong> <code class="mono text-indigo text-break">${data.leafHash}</code></div>
                    <div><strong>Merkle Authentication Steps:</strong></div>
                    <ul class="mono text-muted mt-2" style="font-size:0.78rem; list-style:none;">
                        <li>Step 1 (Left Hash): ${data.merkleProofPath[0].hash.substring(0, 24)}...</li>
                        <li>Step 2 (Right Hash): ${data.merkleProofPath[1].hash.substring(0, 24)}...</li>
                    </ul>
                </div>
            </div>
        `;

        modal.classList.add('show');
    } catch (e) {
        showToast('Error generating Merkle proof', true);
    }
}

function closeInspectorModal(e) {
    const modal = document.getElementById('inspector-modal');
    if (modal) modal.classList.remove('show');
}

// ========================================================
// 4. ARCHITECTURE STACK & SDK HANDLERS
// ========================================================
function selectStackLayer(layerNum) {
    document.querySelectorAll('.stack-layer-card').forEach((el, idx) => {
        if (idx + 1 === layerNum) el.classList.add('active');
        else el.classList.remove('active');
    });

    const data = STACK_LAYERS_DATA[layerNum];
    if (!data) return;

    const detailsBox = document.getElementById('stack-layer-details');
    detailsBox.innerHTML = `
        <div style="animation: fadeIn 0.3s ease;">
            <span class="mono" style="font-size:0.75rem; color:#818cf8; font-weight:800; letter-spacing:1.5px;">${data.num}</span>
            <h3 style="font-family:var(--font-heading); font-size:1.35rem; color:#ffffff; margin:4px 0 2px;">${data.title}</h3>
            <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:16px;">${data.subtitle}</div>
            ${data.content}
        </div>
    `;
}

function switchSdkTab(tabKey) {
    currentSdkTab = tabKey;
    document.querySelectorAll('.sdk-tab').forEach(btn => btn.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.sdk-tab')).find(b => 
        b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabKey)
    );
    if (activeBtn) activeBtn.classList.add('active');

    const config = SDK_EXAMPLES[tabKey];
    if (config) {
        document.getElementById('sdk-code-filename').textContent = config.file;
        document.getElementById('sdk-code-content').textContent = config.code;
    }
}

function copySdkCode() {
    const config = SDK_EXAMPLES[currentSdkTab];
    if (config) {
        navigator.clipboard.writeText(config.code);
        showToast('SDK code copied to clipboard!');
    }
}

// ========================================================
// 5. INTERACTIVE SYNAPTIC CANVAS
// ========================================================
function initNeuralCanvas() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const particleCount = Math.min(65, Math.floor(window.innerWidth / 24));

    for (let i = 0; i < particleCount; i++) {
        const color = i % 4 === 0 ? 'rgba(99, 102, 241, ' : i % 4 === 1 ? 'rgba(56, 189, 248, ' : i % 4 === 2 ? 'rgba(168, 85, 247, ' : 'rgba(52, 211, 153, ';
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1.2,
            color: color
        });
    }

    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color + '0.85)';
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color + '0.5)';
            ctx.fill();
            ctx.shadowBlur = 0;

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    const alpha = (1 - dist / 150) * 0.30;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            const mdx = p.x - mouse.x;
            const mdy = p.y - mouse.y;
            const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mdist < 200) {
                const alpha = (1 - mdist / 200) * 0.55;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                ctx.lineWidth = 1.4;
                ctx.stroke();
            }
        }

        requestAnimationFrame(draw);
    }
    draw();
}

// SPOTLIGHT
function initSpotlightCards() {
    document.querySelectorAll('.spotlight-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

// SCROLL REVEAL
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// MOBILE NAVIGATION DRAWER
function toggleMobileMenu() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const icon = document.getElementById('mobile-menu-icon');
    if (!drawer) return;

    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
        if (icon) icon.className = 'fa-solid fa-xmark';
    } else {
        if (icon) icon.className = 'fa-solid fa-bars';
    }
}

function closeAndNavigate(viewName, scrollTargetId = null) {
    const drawer = document.getElementById('mobile-nav-drawer');
    const icon = document.getElementById('mobile-menu-icon');
    if (drawer) drawer.classList.remove('open');
    if (icon) icon.className = 'fa-solid fa-bars';
    navigateTo(viewName, scrollTargetId);
}

// ROUTER
function navigateTo(viewName, scrollTargetId = null) {
    document.querySelectorAll('.view-pane').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (viewName === 'dex') {
        setTimeout(() => {
            initDex();
        }, 60);
    }

    if (viewName === 'landing' && scrollTargetId) {
        setTimeout(() => {
            const el = document.getElementById(scrollTargetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }
}

// OS SWITCHER
function switchOsTab(osKey) {
    currentOs = osKey;
    document.querySelectorAll('.os-tab').forEach(el => el.classList.remove('active'));

    const matchingBtn = Array.from(document.querySelectorAll('.os-tab')).find(btn => 
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(osKey)
    );
    if (matchingBtn) matchingBtn.classList.add('active');

    const config = OS_SCRIPTS[osKey];
    if (config) {
        document.getElementById('os-terminal-title').textContent = config.title;
        document.getElementById('os-code-content').textContent = config.code;
    }
}

function copyTerminalCode() {
    const config = OS_SCRIPTS[currentOs];
    if (config) {
        navigator.clipboard.writeText(config.code);
        showToast('Terminal commands copied to clipboard!');
    }
}

// COST CALCULATOR
function updateCostCalculator() {
    const volumeSlider = document.getElementById('cost-volume-slider');
    const yearsSlider = document.getElementById('cost-years-slider');
    if (!volumeSlider || !yearsSlider) return;

    const vectors = Number(volumeSlider.value);
    const years = Number(yearsSlider.value);

    document.getElementById('cost-volume-val').textContent = `${(vectors).toLocaleString()} Vectors`;
    document.getElementById('cost-years-val').textContent = `${years} Year${years > 1 ? 's' : ''}`;

    const monthlyLegacy = (vectors / 100000) * 140;
    const totalLegacy = Math.round(monthlyLegacy * 12 * years);

    const oneTimeCortex = Math.round(vectors * 0.0025);
    const savings = Math.max(0, totalLegacy - oneTimeCortex);
    const savingsPercent = Math.round((savings / totalLegacy) * 100);

    document.getElementById('cost-legacy-total').textContent = `$${totalLegacy.toLocaleString()}`;
    document.getElementById('cost-cortex-total').textContent = `$${oneTimeCortex.toLocaleString()}`;
    document.getElementById('cost-savings-amount').textContent = `$${savings.toLocaleString()} (${savingsPercent}%)`;
}

// MERKLE INSPECTOR
function inspectNode(nodeKey) {
    document.querySelectorAll('.merkle-node').forEach(el => el.classList.remove('active'));
    
    const el = event.currentTarget;
    if (el) el.classList.add('active');

    const data = MERKLE_NODES_DATA[nodeKey];
    if (!data) return;

    const detailsBox = document.getElementById('merkle-inspector-details');
    detailsBox.innerHTML = `
        <div class="inspector-header">
            <span class="pill-badge pill-violet-light font-bold">${data.tag}: ${escapeHtml(data.title)}</span>
            <span class="mono text-muted" style="font-size:0.75rem;">Vector Dimensions: 768 float32</span>
        </div>
        <div class="inspector-grid mt-2">
            <div><strong>Hash Digest:</strong> <span class="mono text-indigo">${data.hash}</span></div>
            <div><strong>Raw Content:</strong> ${escapeHtml(data.payload)}</div>
            <div><strong>Signer Address:</strong> <span class="mono text-slate-800">${data.signer}</span></div>
            <div><strong>Deflationary Burn:</strong> <span class="text-flame font-bold">${data.gasBurned}</span></div>
        </div>
    `;

    showToast(`Inspecting: ${data.title}`);
}

// FAQ
function toggleFaq(element) {
    const isOpen = element.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
    if (!isOpen) {
        element.classList.add('open');
    }
}

// TOAST
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.borderColor = isError ? 'var(--flame)' : 'var(--indigo)';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// STATS
async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        currentDifficulty = data.difficulty;

        const elHeight = document.getElementById('ticker-height');
        if (elHeight) elHeight.textContent = `#${data.height}`;
        const elDiff = document.getElementById('ticker-diff');
        if (elDiff) elDiff.textContent = data.difficulty;
        const elBurned = document.getElementById('ticker-burned');
        if (elBurned) elBurned.textContent = `${(data.totalBurned || 0).toFixed(3)} CTX 🔥`;

        const elHeroBlocks = document.getElementById('hero-stat-blocks');
        if (elHeroBlocks) elHeroBlocks.textContent = (data.height || 0).toLocaleString();
        const elHeroMemories = document.getElementById('hero-stat-memories');
        if (elHeroMemories) elHeroMemories.textContent = (data.totalMemories || 0).toLocaleString();

        const hr = (data.networkHashrate !== undefined && data.networkHashrate !== null && data.networkHashrate > 0)
            ? data.networkHashrate
            : ((data.miner && data.miner.hashrate) || 0);
        const hrText = hr >= 1000000 
            ? `${(hr/1000000).toFixed(2)} MH/s` 
            : hr >= 1000 
            ? `${(hr/1000).toFixed(2)} kH/s` 
            : `${hr} H/s`;
        const elTickerHr = document.getElementById('ticker-hr');
        if (elTickerHr) elTickerHr.textContent = hrText;

        updateMiningCalculator();
    } catch (e) {}
}

// MINING YIELD CALCULATOR
function updateMiningCalculator() {
    const slider = document.getElementById('calc-cores-slider');
    if (!slider) return;

    const cores = Number(slider.value);
    document.getElementById('calc-cores-val').textContent = `${cores} Thread${cores > 1 ? 's' : ''}`;

    const estimatedKh = cores * 15;
    document.getElementById('calc-estimated-hr').textContent = `${estimatedKh} kH/s`;
    document.getElementById('calc-network-diff').textContent = currentDifficulty;

    const baseDaily = Math.round((cores * 32) * (3 / Math.max(1, currentDifficulty)));
    const baseMonthly = baseDaily * 30;

    document.getElementById('calc-daily-ctx').textContent = `~ ${baseDaily.toLocaleString()} CTX`;
    document.getElementById('calc-monthly-ctx').textContent = `~ ${baseMonthly.toLocaleString()} CTX`;
}

// BLOCKS
async function fetchBlocks() {
    try {
        const res = await fetch('/api/blocks?limit=15');
        const blocks = await res.json();
        const tbody = document.getElementById('blocks-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        blocks.forEach(block => {
            const tr = document.createElement('tr');
            tr.onclick = () => openBlockInspector(block.index);
            const memoryCount = block.transactions.filter(t => t.type === 'MEMORY_COMMIT').length;
            const shortHash = `${block.hash.substring(0, 10)}...${block.hash.substring(block.hash.length - 6)}`;
            const shortMiner = block.minerAddress ? `${block.minerAddress.substring(0, 10)}...` : 'Genesis';

            tr.innerHTML = `
                <td><strong class="text-indigo">#${block.index}</strong></td>
                <td><span class="mono text-muted">${shortMiner}</span></td>
                <td><span class="text-amber font-bold">${block.transactions.length} tx</span> ${memoryCount > 0 ? `<span class="pill-badge pill-violet-light" style="padding: 2px 6px; font-size:0.65rem;">${memoryCount} AI</span>` : ''}</td>
                <td><span class="mono">${block.difficulty}</span></td>
                <td><span class="mono text-indigo">${shortHash}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {}
}

// MEMORIES
async function fetchMemories() {
    try {
        const res = await fetch('/api/memories');
        const memories = await res.json();
        const container = document.getElementById('memory-feed-container');
        if (!container) return;

        if (memories.length === 0) {
            container.innerHTML = '<p class="empty-state">No AI memories recorded yet.</p>';
            return;
        }

        container.innerHTML = '';
        memories.reverse().slice(0, 20).forEach(item => {
            const card = document.createElement('div');
            card.className = 'memory-card-light';
            card.onclick = () => openBlockInspector(item.blockIndex);
            const dateStr = new Date(item.timestamp).toLocaleTimeString();

            card.innerHTML = `
                <div class="memory-card-header-light">
                    <span class="memory-agent-light"><i class="fa-solid fa-robot"></i> ${escapeHtml(item.memory.agentId)}</span>
                    <span class="pill-badge pill-violet-light" style="font-size: 0.65rem;">${escapeHtml(item.memory.topic)}</span>
                </div>
                <div class="memory-content-light">${escapeHtml(item.memory.content)}</div>
                <div class="memory-footer-light">
                    <span>Block #${item.blockIndex} • ${dateStr}</span>
                    <span class="text-indigo font-bold">Vector: ${item.memory.vectorHash.substring(0, 8)}...</span>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {}
}

// MEMPOOL
async function fetchMempool() {
    try {
        const res = await fetch('/api/mempool');
        const txs = await res.json();
        const container = document.getElementById('mempool-container');
        const countBadge = document.getElementById('mempool-count');
        if (!container || !countBadge) return;

        countBadge.textContent = `${txs.length} pending`;

        if (txs.length === 0) {
            container.innerHTML = '<p class="empty-state">No pending transactions. Network state is synchronized.</p>';
            return;
        }

        container.innerHTML = '';
        txs.forEach(tx => {
            const div = document.createElement('div');
            div.className = 'memory-card-light';
            div.style.borderLeftColor = 'var(--amber)';
            div.innerHTML = `
                <div class="memory-card-header-light">
                    <span class="text-amber font-bold">Type: ${tx.type}</span>
                    <span class="mono">Fee: ${tx.fee} CTX</span>
                </div>
                <div class="mono" style="font-size:0.8rem; color: var(--slate-600);">
                    From: ${tx.sender.substring(0, 14)}... ➜ To: ${tx.recipient.substring(0, 14)}... | Amount: ${tx.amount} CTX
                </div>
            `;
            container.appendChild(div);
        });
    } catch (e) {}
}

// WALLET MANAGEMENT
function generateNewWallet() {
    fetch('/api/wallet/create', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            currentWallet = data;
            saveWallet(data);
            renderWallet();
            showToast('New $CTX Wallet generated successfully!');
        });
}

function importWallet() {
    const privKey = document.getElementById('import-privkey-input').value.trim();
    if (!privKey) return showToast('Please enter a private key', true);

    fetch('/api/wallet/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: privKey })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) return showToast(data.error, true);
        currentWallet = data;
        saveWallet(data);
        updateAllWalletDisplays();
        showToast('Wallet connected successfully!');
        const input = document.getElementById('import-privkey-input');
        if (input) input.value = '';
    })
    .catch(err => showToast(err.message, true));
}

function saveWallet(wallet) {
    localStorage.setItem('cortex_wallet', JSON.stringify(wallet));
}

function loadSavedWallet() {
    const saved = localStorage.getItem('cortex_wallet');
    if (saved) {
        try {
            currentWallet = JSON.parse(saved);
            updateAllWalletDisplays();
            updateWalletBalance();
        } catch(e) {}
    } else {
        updateAllWalletDisplays();
    }
}

function updateAllWalletDisplays() {
    const headerContainer = document.getElementById('header-wallet-container');
    const dexSwapBtn = document.getElementById('dex-swap-btn');
    const addrDisplay = document.getElementById('wallet-address-display');
    const secretBox = document.getElementById('wallet-secret-info');
    const privDisplay = document.getElementById('wallet-privatekey-display');
    const modalAddr = document.getElementById('modal-acc-address');
    const modalBal = document.getElementById('modal-acc-balance');

    if (currentWallet) {
        const shortAddr = `${currentWallet.address.substring(0, 8)}...${currentWallet.address.substring(currentWallet.address.length - 4)}`;
        const balNum = (currentWallet.balance || 0).toFixed(2);

        // Header button shows connected pill
        if (headerContainer) {
            headerContainer.innerHTML = `
                <div class="connected-wallet-pill" onclick="openWalletAccountModal()" title="View Account Details">
                    <span class="dot-indicator"></span>
                    <span class="mono text-xs font-bold text-slate-800">${shortAddr}</span>
                    <span class="badge-subtle badge-emerald mono text-xs font-bold">${balNum} CTX</span>
                </div>
            `;
        }

        if (addrDisplay) addrDisplay.textContent = currentWallet.address;
        if (secretBox) secretBox.style.display = 'block';
        if (privDisplay) privDisplay.textContent = currentWallet.privateKey;
        if (modalAddr) modalAddr.textContent = currentWallet.address;
        if (modalBal) modalBal.textContent = `${balNum} CTX`;

        // DEX Swap Button
        if (dexSwapBtn) {
            dexSwapBtn.setAttribute('onclick', 'executeDexSwap()');
            dexSwapBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Swap Tokens Instantly';
        }
    } else {
        // Disconnected state
        if (headerContainer) {
            headerContainer.innerHTML = `
                <button class="btn btn-primary nav-wallet-btn" id="nav-connect-wallet-btn" onclick="openConnectWalletModal()">
                    <i class="fa-solid fa-wallet"></i> <span>Connect Wallet</span>
                </button>
            `;
        }

        if (addrDisplay) addrDisplay.textContent = 'No wallet connected';
        if (secretBox) secretBox.style.display = 'none';

        // DEX Swap Button in disconnected state
        if (dexSwapBtn) {
            dexSwapBtn.setAttribute('onclick', 'openConnectWalletModal()');
            dexSwapBtn.innerHTML = '<i class="fa-solid fa-wallet"></i> Connect Wallet to Swap';
        }
    }

    if (typeof updateDexBalances === 'function') {
        updateDexBalances();
    }
}

async function updateWalletBalance() {
    if (!currentWallet) return;
    try {
        const res = await fetch(`/api/balance/${currentWallet.address}`);
        const data = await res.json();
        currentWallet.balance = data.balance;
        saveWallet(currentWallet);
        
        const balDisplay = document.getElementById('wallet-balance-display');
        if (balDisplay) {
            balDisplay.innerHTML = `${data.balance.toFixed(2)} <span class="currency">CTX</span>`;
        }
        updateAllWalletDisplays();
    } catch(e) {}
}

function openConnectWalletModal() {
    const modal = document.getElementById('connect-wallet-modal');
    if (modal) modal.classList.add('active');
}

function closeConnectWalletModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('connect-wallet-modal');
    if (modal) modal.classList.remove('active');
}

function openWalletAccountModal() {
    const modal = document.getElementById('wallet-account-modal');
    if (modal) {
        updateAllWalletDisplays();
        modal.classList.add('active');
    }
}

function closeWalletAccountModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('wallet-account-modal');
    if (modal) modal.classList.remove('active');
}

async function connectCortexExtension() {
    if (window.cortex && typeof window.cortex.request === 'function') {
        try {
            const accounts = await window.cortex.request({ method: 'ctx_requestAccounts' });
            if (accounts && accounts.length > 0) {
                const extAddr = accounts[0];
                currentWallet = {
                    address: extAddr,
                    isExtension: true
                };
                saveWallet(currentWallet);
                updateWalletBalance();
                closeConnectWalletModal();
                showToast(`🟢 Cortex Extension Connected: ${extAddr.substring(0, 10)}...!`);
                return;
            }
        } catch(e) {
            showToast('Extension connection rejected or locked', true);
        }
    } else {
        // Extension not detected: prompt download
        showToast('Extension not detected. Downloading ZIP package...', false);
        window.location.href = '/downloads/cortex-wallet-extension.zip';
    }
}

function connectBrowserVault() {
    const saved = localStorage.getItem('cortex_wallet');
    if (saved) {
        try {
            currentWallet = JSON.parse(saved);
            updateWalletBalance();
            closeConnectWalletModal();
            showToast('🟢 Cortex Web Vault Connected!');
            return;
        } catch(e) {}
    }
    // Generate new wallet if none exists
    generateNewWallet();
    closeConnectWalletModal();
    showToast('🟢 New Secure Vault Created & Connected!');
}

function togglePrivKeyModalInput() {
    const acc = document.getElementById('modal-privkey-accordion');
    if (acc) {
        acc.style.display = acc.style.display === 'none' ? 'block' : 'none';
    }
}

function connectWithPrivateKeyInput() {
    const input = document.getElementById('modal-privkey-input');
    const key = input ? input.value.trim() : '';
    if (!key || key.length < 32) {
        showToast('Please enter a valid private key hex', true);
        return;
    }

    fetch('/api/wallet/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privateKey: key })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) return showToast(data.error, true);
        currentWallet = data;
        saveWallet(data);
        updateWalletBalance();
        closeConnectWalletModal();
        if (input) input.value = '';
        showToast('🟢 Wallet Connected Successfully!');
    })
    .catch(err => showToast(err.message, true));
}

function importKeystoreFileFromModal(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.encryptedPrivateKey) {
                return showToast('Invalid keystore format', true);
            }
            const privKey = atob(data.encryptedPrivateKey);
            fetch('/api/wallet/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ privateKey: privKey })
            })
            .then(res => res.json())
            .then(walletData => {
                if (walletData.error) return showToast(walletData.error, true);
                currentWallet = walletData;
                saveWallet(walletData);
                updateWalletBalance();
                closeConnectWalletModal();
                showToast(`🟢 Keystore Connected for ${walletData.address.substring(0, 10)}...!`);
            });
        } catch(err) {
            showToast('Failed to parse keystore JSON file', true);
        }
    };
    reader.readAsText(file);
}

function disconnectWallet() {
    localStorage.removeItem('cortex_wallet');
    currentWallet = null;
    closeWalletAccountModal();
    updateAllWalletDisplays();
    showToast('Wallet disconnected.');
}

function copyWalletAddress() {
    if (!currentWallet) return;
    navigator.clipboard.writeText(currentWallet.address);
    showToast('Address copied to clipboard!');
}

// SEND TRANSACTIONS
async function sendTransaction() {
    if (!currentWallet) return showToast('No wallet connected', true);

    const recipient = document.getElementById('send-recipient-input').value.trim();
    const amount = document.getElementById('send-amount-input').value;
    const fee = document.getElementById('send-fee-input').value;
    const statusMsg = document.getElementById('send-status-msg');

    if (!recipient || !amount || Number(amount) <= 0) {
        return showToast('Please enter a valid recipient and amount', true);
    }

    try {
        statusMsg.innerHTML = '<span class="text-amber">Signing with secp256k1 & broadcasting...</span>';
        const res = await fetch('/api/transactions/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                privateKey: currentWallet.privateKey,
                recipient,
                amount: Number(amount),
                fee: Number(fee)
            })
        });

        const data = await res.json();
        if (data.error) {
            statusMsg.innerHTML = `<span class="text-flame">Error: ${data.error}</span>`;
            return showToast(data.error, true);
        }

        statusMsg.innerHTML = `<span class="text-emerald font-bold">✓ Transaction confirmed! TxID: ${data.txId.substring(0, 16)}...</span>`;
        showToast('Transaction broadcasted to mempool!');
        document.getElementById('send-recipient-input').value = '';
        document.getElementById('send-amount-input').value = '';
        fetchMempool();
    } catch (err) {
        statusMsg.innerHTML = `<span class="text-flame">Error: ${err.message}</span>`;
    }
}

// AI AGENT DEMO: COMMIT MEMORY
async function commitAIMemory() {
    if (!currentWallet) return showToast('No wallet connected', true);

    const agentId = document.getElementById('ai-agent-id').value.trim();
    const topic = document.getElementById('ai-topic').value.trim();
    const memoryType = document.getElementById('ai-memory-type').value;
    const content = document.getElementById('ai-content').value.trim();

    if (!agentId || !topic || !content) {
        return showToast('Please complete all fields', true);
    }

    try {
        const res = await fetch('/api/memory/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentPrivateKey: currentWallet.privateKey,
                agentId,
                topic,
                memoryType,
                content,
                fee: 0.05
            })
        });

        const data = await res.json();
        if (data.error) {
            return showToast(data.error, true);
        }

        showToast('🧠 Memory inscribed (30% burned)!');
        fetchMempool();
        executeSemanticSearch();
    } catch(err) {
        showToast(err.message, true);
    }
}

// AI AGENT DEMO: SEARCH
async function searchMemories() {
    const query = document.getElementById('search-memory-input').value.trim();
    const container = document.getElementById('ai-search-results');
    if (!container) return;

    try {
        const res = await fetch(`/api/memories?topic=${encodeURIComponent(query)}`);
        const results = await res.json();

        if (results.length === 0) {
            container.innerHTML = '<p class="empty-state">No matching memories found for this query.</p>';
            return;
        }

        container.innerHTML = '';
        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'memory-card-light';
            div.innerHTML = `
                <div class="memory-card-header-light">
                    <span class="memory-agent-light"><i class="fa-solid fa-robot"></i> ${escapeHtml(item.memory.agentId)}</span>
                    <span class="pill-badge pill-violet-light">${escapeHtml(item.memory.topic)}</span>
                </div>
                <div class="memory-content-light">${escapeHtml(item.memory.content)}</div>
                <div class="memory-footer-light">
                    <span>Block #${item.blockIndex}</span>
                    <span class="mono text-indigo">Vector: ${item.memory.vectorHash.substring(0, 12)}...</span>
                </div>
            `;
            container.appendChild(div);
        });
    } catch(e) {}
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// TESTNET FAUCET CLAIM
async function claimFaucet() {
    const input = document.getElementById('faucet-address-input');
    const statusMsg = document.getElementById('faucet-status-msg');
    const btn = document.getElementById('faucet-claim-btn');
    const address = input && input.value.trim() ? input.value.trim() : (currentWallet ? currentWallet.address : '');

    if (!address || !address.startsWith('ctx1')) {
        if (statusMsg) statusMsg.innerHTML = '<span class="text-flame">Please create or enter a valid Cortex address (ctx1...).</span>';
        return showToast('Please enter a valid ctx1... address', true);
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    }

    try {
        const res = await fetch('/api/faucet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        });
        const data = await res.json();

        if (data.error) {
            if (statusMsg) statusMsg.innerHTML = `<span class="text-flame">⚠️ ${data.error}</span>`;
            showToast(data.error, true);
        } else {
            if (statusMsg) statusMsg.innerHTML = `<span class="text-emerald font-bold">✓ ${data.message}</span>`;
            showToast('💧 5.00 Testnet $CTX successfully received!');
            if (currentWallet && currentWallet.address === address) {
                fetchWalletBalance();
            }
            fetchMempool();
        }
    } catch(err) {
        if (statusMsg) statusMsg.innerHTML = `<span class="text-flame">⚠️ ${err.message}</span>`;
        showToast(err.message, true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-droplet"></i> Claim 5 CTX';
        }
    }
}

// ========================================================
// AUTONOMOUS AI SWARM CANVAS & MESH ENGINE
// ========================================================
let swarmCanvas, swarmCtx;
let swarmAnimFrame;
let swarmPackets = [];
const SWARM_NODES = [
    { id: 'Alpha-Trader-01', name: 'Alpha-Trader-01', domain: 'DeFi Alpha', color: '#10b981', angle: -140, radius: 110, icon: '📈' },
    { id: 'Bio-Genesis-AI', name: 'Bio-Genesis-AI', domain: 'Biomedical', color: '#8b5cf6', angle: -40, radius: 110, icon: '🧬' },
    { id: 'Cyber-Sentinel-X', name: 'Cyber-Sentinel-X', domain: 'Cyber Security', color: '#6366f1', angle: 90, radius: 110, icon: '🛡️' }
];

const SWARM_REASONING_POOL = [
    {
        agentId: 'Alpha-Trader-01',
        topic: 'cross_dex_arbitrage',
        thought: 'Identified 3.8% spread between Curve and Balancer on Arbitrum. Executed 16.5 ETH swap.',
        color: '#10b981'
    },
    {
        agentId: 'Bio-Genesis-AI',
        topic: 'kinase_cx409_docking',
        thought: 'Completed molecular affinity folding CX-409: -15.2 kcal/mol binding energy against oncogene target.',
        color: '#8b5cf6'
    },
    {
        agentId: 'Cyber-Sentinel-X',
        topic: 'oracle_flashloan_defense',
        thought: 'Intercepted manipulative flashloan borrow pattern on lending market. Broadcasted guard proof to L1.',
        color: '#6366f1'
    }
];

function initSwarmCanvas() {
    swarmCanvas = document.getElementById('swarm-canvas');
    if (!swarmCanvas) return;
    swarmCtx = swarmCanvas.getContext('2d');

    function resize() {
        const rect = swarmCanvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        swarmCanvas.width = rect.width * dpr;
        swarmCanvas.height = rect.height * dpr;
        swarmCtx.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    // Initial feed populate
    renderInitialSwarmFeed();

    // Spawn gentle background packets every 2s
    setInterval(() => {
        if (!swarmCanvas) return;
        const fromIdx = Math.floor(Math.random() * SWARM_NODES.length);
        spawnSwarmPacket(fromIdx, 'core');
    }, 2200);

    animateSwarm();
}

function spawnSwarmPacket(fromIdx, toTarget = 'core') {
    const node = SWARM_NODES[fromIdx];
    swarmPackets.push({
        fromIdx,
        toTarget,
        progress: 0,
        speed: 0.018 + Math.random() * 0.012,
        color: node.color,
        size: 4 + Math.random() * 2
    });
}

function animateSwarm() {
    if (!swarmCtx || !swarmCanvas) return;
    const w = swarmCanvas.parentElement.clientWidth;
    const h = swarmCanvas.parentElement.clientHeight;
    const cx = w / 2;
    const cy = h / 2;

    swarmCtx.clearRect(0, 0, w, h);

    // 1. Draw connection lines from nodes to center Core
    SWARM_NODES.forEach((node, idx) => {
        const rad = (node.angle * Math.PI) / 180;
        const nx = cx + Math.cos(rad) * node.radius * (w > 600 ? 1.4 : 1.0);
        const ny = cy + Math.sin(rad) * node.radius * (h > 260 ? 1.0 : 0.8);

        // Gradient line
        const grad = swarmCtx.createLinearGradient(cx, cy, nx, ny);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        grad.addColorStop(1, node.color);

        swarmCtx.beginPath();
        swarmCtx.moveTo(cx, cy);
        swarmCtx.lineTo(nx, ny);
        swarmCtx.strokeStyle = grad;
        swarmCtx.lineWidth = 1.5;
        swarmCtx.setLineDash([4, 4]);
        swarmCtx.stroke();
        swarmCtx.setLineDash([]);

        // Outer Node circle
        swarmCtx.beginPath();
        swarmCtx.arc(nx, ny, 16, 0, Math.PI * 2);
        swarmCtx.fillStyle = '#ffffff';
        swarmCtx.fill();
        swarmCtx.strokeStyle = node.color;
        swarmCtx.lineWidth = 2.5;
        swarmCtx.stroke();

        // Node pulse aura
        swarmCtx.beginPath();
        swarmCtx.arc(nx, ny, 22, 0, Math.PI * 2);
        swarmCtx.strokeStyle = node.color + '33';
        swarmCtx.lineWidth = 1.5;
        swarmCtx.stroke();

        // Node Label
        swarmCtx.font = 'bold 11px Inter, sans-serif';
        swarmCtx.fillStyle = '#1e293b';
        swarmCtx.textAlign = 'center';
        swarmCtx.fillText(node.name, nx, ny + 32);
    });

    // 2. Draw moving packets
    for (let i = swarmPackets.length - 1; i >= 0; i--) {
        const p = swarmPackets[i];
        p.progress += p.speed;

        if (p.progress >= 1.0) {
            swarmPackets.splice(i, 1);
            continue;
        }

        const node = SWARM_NODES[p.fromIdx];
        const rad = (node.angle * Math.PI) / 180;
        const nx = cx + Math.cos(rad) * node.radius * (w > 600 ? 1.4 : 1.0);
        const ny = cy + Math.sin(rad) * node.radius * (h > 260 ? 1.0 : 0.8);

        // Interpolate position
        const px = nx + (cx - nx) * p.progress;
        const py = ny + (cy - ny) * p.progress;

        // Glowing packet dot
        swarmCtx.beginPath();
        swarmCtx.arc(px, py, p.size, 0, Math.PI * 2);
        swarmCtx.fillStyle = p.color;
        swarmCtx.shadowColor = p.color;
        swarmCtx.shadowBlur = 10;
        swarmCtx.fill();
        swarmCtx.shadowBlur = 0;
    }

    swarmAnimFrame = requestAnimationFrame(animateSwarm);
}

function renderInitialSwarmFeed() {
    const feed = document.getElementById('swarm-activity-feed');
    if (!feed) return;
    feed.innerHTML = `
        <div class="stream-item">
            <div class="flex items-center gap-2">
                <span class="text-emerald font-bold">📈 [Alpha-Trader-01]</span>
                <span class="text-slate-600">Spatial arbitrage notarized: 3.4% spread on Curve</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="mono text-xs text-flame font-bold">-0.015 CTX 🔥</span>
                <span class="badge-subtle text-xs">Merkle Verified</span>
            </div>
        </div>
        <div class="stream-item">
            <div class="flex items-center gap-2">
                <span class="text-violet font-bold">🧬 [Bio-Genesis-AI]</span>
                <span class="text-slate-600">Kinase CX-882 docking affinity anchored: -14.8 kcal/mol</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="mono text-xs text-flame font-bold">-0.015 CTX 🔥</span>
                <span class="badge-subtle text-xs">Merkle Verified</span>
            </div>
        </div>
        <div class="stream-item">
            <div class="flex items-center gap-2">
                <span class="text-indigo font-bold">🛡️ [Cyber-Sentinel-X]</span>
                <span class="text-slate-600">Reentrancy interceptor proof inscribed for ERC-4626 vault</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="mono text-xs text-flame font-bold">-0.015 CTX 🔥</span>
                <span class="badge-subtle text-xs">Merkle Verified</span>
            </div>
        </div>
    `;
}

function triggerSwarmReasoning() {
    const randomItem = SWARM_REASONING_POOL[Math.floor(Math.random() * SWARM_REASONING_POOL.length)];
    const nodeIdx = SWARM_NODES.findIndex(n => n.id === randomItem.agentId);

    // Spawn high-speed visual pulses
    for (let k = 0; k < 4; k++) {
        setTimeout(() => spawnSwarmPacket(nodeIdx, 'core'), k * 120);
    }

    // Update agent card bubble & counter
    if (randomItem.agentId === 'Alpha-Trader-01') {
        const thoughtEl = document.getElementById('trader-thought');
        const countEl = document.getElementById('trader-mem-count');
        if (thoughtEl) thoughtEl.textContent = `"${randomItem.thought}"`;
        if (countEl) countEl.textContent = Number(countEl.textContent || 24) + 1;
    } else if (randomItem.agentId === 'Bio-Genesis-AI') {
        const thoughtEl = document.getElementById('bio-thought');
        const countEl = document.getElementById('bio-mem-count');
        if (thoughtEl) thoughtEl.textContent = `"${randomItem.thought}"`;
        if (countEl) countEl.textContent = Number(countEl.textContent || 56) + 1;
    } else {
        const thoughtEl = document.getElementById('cyber-thought');
        const countEl = document.getElementById('cyber-mem-count');
        if (thoughtEl) thoughtEl.textContent = `"${randomItem.thought}"`;
        if (countEl) countEl.textContent = Number(countEl.textContent || 19) + 1;
    }

    // Add event stream item
    const feed = document.getElementById('swarm-activity-feed');
    if (feed) {
        const timeStr = new Date().toLocaleTimeString();
        const itemHtml = `
            <div class="stream-item">
                <div class="flex items-center gap-2">
                    <span style="color:${randomItem.color}; font-weight:bold;">[${randomItem.agentId}]</span>
                    <span class="text-slate-800">${randomItem.thought}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="mono text-xs text-flame font-bold">-0.015 CTX 🔥</span>
                    <span class="badge-subtle text-xs" style="color:var(--emerald);">Verified ✓</span>
                </div>
            </div>
        `;
        feed.insertAdjacentHTML('afterbegin', itemHtml);
        if (feed.children.length > 5) {
            feed.lastElementChild.remove();
        }
    }

    showToast(`🧠 Swarm Reasoning Active: ${randomItem.agentId} inscribed on-chain state!`);
}

function resetSwarmSimulation() {
    swarmPackets = [];
    renderInitialSwarmFeed();
    showToast('Swarm Mesh state reset!');
}

async function fetchPoolStats() {
    try {
        const res = await fetch('/api/pool/stats');
        const data = await res.json();
        if (!data) return;

        const hrEl = document.getElementById('pool-hashrate-val');
        const minersEl = document.getElementById('pool-miners-count');
        const diffEl = document.getElementById('pool-share-diff');
        const blocksEl = document.getElementById('pool-blocks-won');
        const tbody = document.getElementById('pool-workers-tbody');

        const hr = data.totalPoolHashrate || 0;
        const hrStr = hr > 1000000 ? `${(hr/1000000).toFixed(2)} MH/s` : hr > 1000 ? `${(hr/1000).toFixed(2)} kH/s` : `${hr} H/s`;

        if (hrEl) hrEl.textContent = hrStr;
        if (minersEl) minersEl.textContent = `${data.connectedMinersCount} Worker${data.connectedMinersCount === 1 ? '' : 's'}`;
        if (diffEl) diffEl.textContent = `Diff ${data.shareDifficulty} (Fast)`;
        if (blocksEl) blocksEl.textContent = `${data.poolBlocksFound} Block${data.poolBlocksFound === 1 ? '' : 's'}`;

        if (tbody) {
            if (data.miners && data.miners.length > 0) {
                tbody.innerHTML = data.miners.map(m => {
                    const mHr = m.hashrate > 1000 ? `${(m.hashrate/1000).toFixed(1)} kH/s` : `${m.hashrate} H/s`;
                    const shortAddr = `${m.address.substring(0, 10)}...${m.address.substring(m.address.length - 6)}`;
                    return `
                        <tr class="border-bottom-subtle">
                            <td class="p-2 mono font-bold text-slate-900">${shortAddr}</td>
                            <td class="p-2 mono text-indigo font-bold">${escapeHtml(m.workerId || 'worker-1')}</td>
                            <td class="p-2 mono text-emerald font-bold">${m.shares} shares</td>
                            <td class="p-2 mono text-slate-700">${mHr}</td>
                            <td class="p-2"><span class="badge-subtle badge-emerald text-xs">● Active</span></td>
                        </tr>
                    `;
                }).join('');
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="p-3 text-center text-slate-400">No external workers connected. Run the 1-Click miner to join the pool!</td>
                    </tr>
                `;
            }
        }
    } catch(e) {}
}

// ========================================================
// DEX AMM SWAP ENGINE & LIQUIDITY POOL
// ========================================================

const dexState = {
    poolCtx: 500000,
    poolUsdc: 622500, // Spot price = $1.2450 USD
    userUsdc: parseFloat(localStorage.getItem('cortex_user_usdc') || '1000.0'),
    fromSymbol: 'CTX',
    toSymbol: 'tUSDC',
    slippage: 0.5
};

function initDex() {
    updateDexBalances();
    drawDexPriceChart();
}

function updateDexBalances() {
    const fromBalEl = document.getElementById('dex-from-balance');
    const toBalEl = document.getElementById('dex-to-balance');
    const spotEl = document.getElementById('dex-spot-price');
    const liqEl = document.getElementById('dex-total-liq');

    const spotPrice = (dexState.poolUsdc / dexState.poolCtx).toFixed(4);
    if (spotEl) spotEl.textContent = `$${spotPrice} USD`;
    if (liqEl) liqEl.textContent = `$${(dexState.poolUsdc * 2).toLocaleString()} USD`;

    const userCtxBal = currentWallet ? (currentWallet.balance || 0) : 0;

    if (dexState.fromSymbol === 'CTX') {
        if (fromBalEl) fromBalEl.textContent = `${userCtxBal.toFixed(2)} CTX`;
        if (toBalEl) toBalEl.textContent = `${dexState.userUsdc.toFixed(2)} tUSDC`;
    } else {
        if (fromBalEl) fromBalEl.textContent = `${dexState.userUsdc.toFixed(2)} tUSDC`;
        if (toBalEl) toBalEl.textContent = `${userCtxBal.toFixed(2)} CTX`;
    }

    calculateDexSwap();
}

function switchDexDirection() {
    const temp = dexState.fromSymbol;
    dexState.fromSymbol = dexState.toSymbol;
    dexState.toSymbol = temp;

    const fromSymEl = document.getElementById('dex-from-symbol');
    const toSymEl = document.getElementById('dex-to-symbol');
    if (fromSymEl) fromSymEl.textContent = dexState.fromSymbol;
    if (toSymEl) toSymEl.textContent = dexState.toSymbol;

    const fromIn = document.getElementById('dex-from-amount');
    const toIn = document.getElementById('dex-to-amount');
    if (fromIn) fromIn.value = '';
    if (toIn) toIn.value = '';

    updateDexBalances();
}

function setSlippage(val, btnEl) {
    dexState.slippage = val;
    document.querySelectorAll('.slippage-box span.cursor-pointer').forEach(el => el.classList.remove('active-slippage', 'font-bold'));
    if (btnEl) btnEl.classList.add('active-slippage', 'font-bold');
    calculateDexSwap();
}

function calculateDexSwap() {
    const fromIn = document.getElementById('dex-from-amount');
    const toIn = document.getElementById('dex-to-amount');
    const rateEl = document.getElementById('dex-rate-quote');
    const feeEl = document.getElementById('dex-fee-quote');
    const impactEl = document.getElementById('dex-price-impact');

    const amountIn = parseFloat(fromIn?.value || '0');
    if (isNaN(amountIn) || amountIn <= 0) {
        if (toIn) toIn.value = '';
        if (feeEl) feeEl.textContent = `0.00 ${dexState.fromSymbol}`;
        if (impactEl) impactEl.textContent = '< 0.01%';
        return;
    }

    const fee = amountIn * 0.003; // 0.3% LP fee
    const amountInWithFee = amountIn - fee;

    let amountOut = 0;
    let impact = 0;

    if (dexState.fromSymbol === 'CTX') {
        // x * y = k => (x + dx) * (y - dy) = k => dy = (y * dx) / (x + dx)
        amountOut = (dexState.poolUsdc * amountInWithFee) / (dexState.poolCtx + amountInWithFee);
        impact = (amountIn / (dexState.poolCtx + amountIn)) * 100;
        if (rateEl) rateEl.textContent = `1 CTX ≈ ${(dexState.poolUsdc / dexState.poolCtx).toFixed(4)} tUSDC`;
    } else {
        amountOut = (dexState.poolCtx * amountInWithFee) / (dexState.poolUsdc + amountInWithFee);
        impact = (amountIn / (dexState.poolUsdc + amountIn)) * 100;
        if (rateEl) rateEl.textContent = `1 tUSDC ≈ ${(dexState.poolCtx / dexState.poolUsdc).toFixed(4)} CTX`;
    }

    if (toIn) toIn.value = amountOut.toFixed(4);
    if (feeEl) feeEl.textContent = `${fee.toFixed(4)} ${dexState.fromSymbol}`;
    if (impactEl) {
        impactEl.textContent = impact < 0.01 ? '< 0.01%' : `${impact.toFixed(2)}%`;
        impactEl.style.color = impact > 5 ? 'var(--flame)' : impact > 1 ? 'var(--amber)' : 'var(--emerald)';
    }
}

async function executeDexSwap() {
    const fromIn = document.getElementById('dex-from-amount');
    const toIn = document.getElementById('dex-to-amount');
    const statusEl = document.getElementById('dex-swap-status-msg');
    const swapBtn = document.getElementById('dex-swap-btn');

    const amountIn = parseFloat(fromIn?.value || '0');
    const amountOut = parseFloat(toIn?.value || '0');

    if (isNaN(amountIn) || amountIn <= 0 || isNaN(amountOut) || amountOut <= 0) {
        if (statusEl) statusEl.innerHTML = '<span class="text-flame">Please enter a valid swap amount.</span>';
        return;
    }

    const userCtxBal = currentWallet ? (currentWallet.balance || 0) : 0;

    if (dexState.fromSymbol === 'CTX') {
        if (amountIn > userCtxBal) {
            if (statusEl) statusEl.innerHTML = `<span class="text-flame">Insufficient CTX balance (${userCtxBal.toFixed(2)} CTX available).</span>`;
            return;
        }
        // Deduct CTX, credit USDC
        dexState.poolCtx += amountIn;
        dexState.poolUsdc -= amountOut;
        dexState.userUsdc += amountOut;
        if (currentWallet) currentWallet.balance = Math.max(0, currentWallet.balance - amountIn);
    } else {
        if (amountIn > dexState.userUsdc) {
            if (statusEl) statusEl.innerHTML = `<span class="text-flame">Insufficient tUSDC balance (${dexState.userUsdc.toFixed(2)} tUSDC available).</span>`;
            return;
        }
        // Deduct USDC, credit CTX
        dexState.poolUsdc += amountIn;
        dexState.poolCtx -= amountOut;
        dexState.userUsdc -= amountIn;
        if (currentWallet) currentWallet.balance = (currentWallet.balance || 0) + amountOut;
    }

    localStorage.setItem('cortex_user_usdc', dexState.userUsdc.toString());

    if (swapBtn) {
        swapBtn.disabled = true;
        swapBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Routing AMM Liquidity Swap...';
    }

    setTimeout(() => {
        if (swapBtn) {
            swapBtn.disabled = false;
            swapBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Swap Tokens Instantly';
        }
        if (statusEl) {
            statusEl.innerHTML = `
                <div class="p-2 bg-emerald-50 rounded-8 text-emerald font-bold">
                    🎉 Swap Confirmed! Received +${amountOut.toFixed(4)} ${dexState.toSymbol}!
                </div>
            `;
        }
        if (fromIn) fromIn.value = '';
        if (toIn) toIn.value = '';

        updateDexBalances();
        drawDexPriceChart();
    }, 600);
}

function addDexLiquidity() {
    const ctxIn = document.getElementById('lp-deposit-ctx');
    const usdcIn = document.getElementById('lp-deposit-usdc');
    const cVal = parseFloat(ctxIn?.value || '0');
    const uVal = parseFloat(usdcIn?.value || '0');

    if (cVal <= 0 || uVal <= 0) {
        alert('Please enter both CTX and tUSDC amounts to provide liquidity.');
        return;
    }

    dexState.poolCtx += cVal;
    dexState.poolUsdc += uVal;
    dexState.userUsdc = Math.max(0, dexState.userUsdc - uVal);
    if (currentWallet) currentWallet.balance = Math.max(0, (currentWallet.balance || 0) - cVal);

    localStorage.setItem('cortex_user_usdc', dexState.userUsdc.toString());
    if (ctxIn) ctxIn.value = '';
    if (usdcIn) usdcIn.value = '';

    alert(`💎 Liquidity Provided! Minted LP-CTX/USDC tokens earning 18.4% APY fee rewards!`);
    updateDexBalances();
    drawDexPriceChart();
}

function setMaxDexInput() {
    const fromIn = document.getElementById('dex-from-amount');
    if (!fromIn) return;
    if (dexState.fromSymbol === 'CTX') {
        const userCtxBal = currentWallet ? (currentWallet.balance || 0) : 0;
        fromIn.value = userCtxBal > 0 ? userCtxBal.toString() : '0';
    } else {
        fromIn.value = dexState.userUsdc.toString();
    }
    calculateDexSwap();
}

function drawDexPriceChart() {
    const canvas = document.getElementById('dex-price-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const w = rect.width || 380;
    const h = 180;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clean background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let y = 30; y < h; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Dynamic price curve based on current spot price
    const currentPrice = dexState.poolUsdc / dexState.poolCtx;
    const points = [
        currentPrice * 0.925,
        currentPrice * 0.942,
        currentPrice * 0.918,
        currentPrice * 0.965,
        currentPrice * 0.952,
        currentPrice * 0.984,
        currentPrice * 0.970,
        currentPrice * 1.012,
        currentPrice * 0.995,
        currentPrice * 1.034,
        currentPrice * 1.008,
        currentPrice
    ];

    const minP = Math.min(...points) * 0.985;
    const maxP = Math.max(...points) * 1.015;
    const stepX = w / (points.length - 1);

    const coords = points.map((p, i) => ({
        x: i * stepX,
        y: h - 28 - ((p - minP) / (maxP - minP)) * (h - 55)
    }));

    // Fill Gradient under price curve
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, h);
    ctx.lineTo(coords[0].x, coords[0].y);
    for (let i = 0; i < coords.length - 1; i++) {
        const xc = (coords[i].x + coords[i + 1].x) / 2;
        const yc = (coords[i].y + coords[i + 1].y) / 2;
        ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.lineTo(coords[coords.length - 1].x, h);
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Price Stroke Line
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 0; i < coords.length - 1; i++) {
        const xc = (coords[i].x + coords[i + 1].x) / 2;
        const yc = (coords[i].y + coords[i + 1].y) / 2;
        ctx.quadraticCurveTo(coords[i].x, coords[i].y, xc, yc);
    }
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pulse dot at current spot price
    const last = coords[coords.length - 1];
    ctx.beginPath();
    ctx.arc(last.x - 3, last.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Price label watermark
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`$${currentPrice.toFixed(4)} USD`, 12, 24);

    ctx.fillStyle = '#10b981';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.fillText('+4.8% (24h continuous AMM curve)', 12, 40);
}

// ========================================================
// CRYPTO VAULT & KEYSTORE BACKUP CONTROLS
// ========================================================

function exportKeystoreJson() {
    if (!currentWallet || !currentWallet.privateKey) {
        alert('Please create or unlock a wallet first.');
        return;
    }

    const keystore = {
        version: 1,
        cryptoEngine: 'secp256k1',
        cipher: 'aes-256-gcm',
        address: currentWallet.address,
        publicKey: currentWallet.publicKey,
        encryptedPrivateKey: btoa(currentWallet.privateKey),
        timestamp: new Date().toISOString(),
        network: 'Cortex Protocol Layer-1'
    };

    const blob = new Blob([JSON.stringify(keystore, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortex-vault-${currentWallet.address.substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importKeystoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.encryptedPrivateKey) {
                alert('Invalid keystore file format.');
                return;
            }
            const privKey = atob(data.encryptedPrivateKey);
            const input = document.getElementById('import-privkey-input');
            if (input) input.value = privKey;
            importWallet();
            alert(`🔒 Keystore Vault Imported Successfully for ${data.address}!`);
        } catch(err) {
            alert('Failed to parse keystore JSON file.');
        }
    };
    reader.readAsText(file);
}

// ========================================================
// INCENTIVIZED TESTNET 2.0 LEADERBOARD & CONVERSION ENGINE
// ========================================================

let cachedLeaderboardData = [];
let currentLeaderboardFilter = 'all';
let currentLeaderboardSearch = '';

async function fetchAndRenderLeaderboard() {
    const refreshIcon = document.getElementById('lb-refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error('Failed to load leaderboard');
        const data = await res.json();
        
        cachedLeaderboardData = data.leaderboard || [];

        // Update Global KPIs
        const countEl = document.getElementById('lb-participants-count');
        if (countEl) countEl.innerText = data.totalParticipants || cachedLeaderboardData.length;

        const allCount = cachedLeaderboardData.length;
        const minerCount = cachedLeaderboardData.filter(u => u.type === 'MINER' || u.type === 'HYBRID').length;
        const testerCount = cachedLeaderboardData.filter(u => u.type === 'TESTER' || u.type === 'HYBRID').length;

        const tabAll = document.getElementById('lb-tab-all-count');
        const tabMin = document.getElementById('lb-tab-miner-count');
        const tabTst = document.getElementById('lb-tab-tester-count');
        if (tabAll) tabAll.innerText = allCount;
        if (tabMin) tabMin.innerText = minerCount;
        if (tabTst) tabTst.innerText = testerCount;

        renderUserPositionCard();
        renderLeaderboardPodium();
        renderLeaderboardTable();
    } catch (e) {
        console.warn('[Leaderboard] Fetch error:', e);
    } finally {
        if (refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('fa-spin'), 600);
        }
    }
}

function renderUserPositionCard() {
    const container = document.getElementById('user-leaderboard-card-container');
    if (!container) return;

    const userAddr = (currentWallet && currentWallet.address) ? currentWallet.address.toLowerCase() : null;
    if (!userAddr) {
        container.innerHTML = '';
        return;
    }

    const myEntry = cachedLeaderboardData.find(u => u.address.toLowerCase() === userAddr);
    if (!myEntry) {
        container.innerHTML = `
            <div class="user-position-banner">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center gap-3">
                        <div class="user-pos-icon"><i class="fa-solid fa-satellite-dish text-indigo"></i></div>
                        <div>
                            <div class="text-sm font-bold text-white">Your Connected Wallet: <span class="mono text-indigo">${userAddr.substring(0, 10)}...${userAddr.substring(userAddr.length - 6)}</span></div>
                            <div class="text-xs text-slate-400 mt-0.5">Not yet ranked on Testnet 2.0. Mine blocks or test swaps to qualify for the 210k $CTX airdrop!</div>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="navigateTo('landing', 'faucet')"><i class="fa-solid fa-faucet-drip"></i> Claim Faucet</button>
                </div>
            </div>
        `;
        return;
    }

    const shortAddr = `${myEntry.address.substring(0, 10)}...${myEntry.address.substring(myEntry.address.length - 6)}`;
    container.innerHTML = `
        <div class="user-position-banner">
            <div class="flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-3">
                    <div class="user-pos-rank-badge">
                        <span class="text-slate-400 font-bold" style="font-size:0.65rem; letter-spacing:0.5px;">YOUR RANK</span>
                        <span class="text-xl font-extrabold text-amber mono">#${myEntry.rank}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="mono font-bold text-white text-sm">${shortAddr}</span>
                            <span class="badge-you">YOU</span>
                            <span class="badge-subtle badge-indigo text-xs font-mono font-bold">${myEntry.type}</span>
                        </div>
                        <div class="text-xs text-slate-300 mt-1 font-mono">
                            <span>Balance: <strong class="text-white">${myEntry.balance.toLocaleString()} $tCTX</strong></span> • 
                            <span>Mined: <strong class="text-amber">${myEntry.blocksMined || 0} blks</strong></span> • 
                            <span>Transfers: <strong class="text-emerald">${myEntry.transfers || 0} txs</strong></span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                    <div class="user-pos-metric-box">
                        <span class="text-xs text-slate-400 font-bold block" style="font-size:0.7rem;">Mainnet Airdrop</span>
                        <div class="text-lg font-bold text-emerald mono">${myEntry.estimatedReward.toLocaleString()} <span class="text-xs text-indigo">CTX</span></div>
                    </div>
                    <div class="user-pos-metric-box">
                        <span class="text-xs text-slate-400 font-bold block" style="font-size:0.7rem;">Day 1 Liquid (20%)</span>
                        <div class="text-sm font-bold text-cyan-400 mono">${myEntry.day1Liquid} CTX</div>
                    </div>
                    <div class="user-pos-metric-box">
                        <span class="text-xs text-slate-400 font-bold block" style="font-size:0.7rem;">90d Stream (80%)</span>
                        <div class="text-sm font-bold text-indigo mono">${myEntry.vestedStream} CTX</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderLeaderboardPodium() {
    const container = document.getElementById('leaderboard-podium-container');
    if (!container) return;

    if (cachedLeaderboardData.length === 0) {
        container.innerHTML = '';
        return;
    }

    const top3 = cachedLeaderboardData.slice(0, 3);
    const podiumStyles = [
        { class: 'podium-gold-dark', rankText: '🥇 #1 CHAMPION', badgeColor: '#fbbf24', crown: '👑' },
        { class: 'podium-silver-dark', rankText: '🥈 #2 RUNNER UP', badgeColor: '#38bdf8', crown: '⭐' },
        { class: 'podium-bronze-dark', rankText: '🥉 #3 THIRD PLACE', badgeColor: '#f97316', crown: '🎖️' }
    ];

    container.innerHTML = top3.map((item, idx) => {
        const p = podiumStyles[idx];
        const shortAddr = `${item.address.substring(0, 8)}...${item.address.substring(item.address.length - 6)}`;
        const tctxBal = (item.balance || (item.blocksMined * 50)).toLocaleString();

        let typeBadge = `<span class="pill-badge pill-violet-light font-mono text-xs">TESTER 🧪</span>`;
        if (item.type === 'MINER') typeBadge = `<span class="pill-badge pill-green-light font-mono text-xs">MINER ⛏️</span>`;
        if (item.type === 'HYBRID') typeBadge = `<span class="pill-badge pill-indigo-light font-mono text-xs">HYBRID ⚡</span>`;

        const isMe = currentWallet && currentWallet.address && currentWallet.address.toLowerCase() === item.address.toLowerCase();
        const youTag = isMe ? '<span class="badge-you ml-1">YOU</span>' : '';

        return `
            <div class="podium-card-dark ${p.class}">
                <span class="podium-crown-badge-v2">${p.crown}</span>
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-xs tracking-wider" style="color:${p.badgeColor};">${p.rankText}</span>
                        ${typeBadge}
                    </div>

                    <div class="flex items-center gap-3 mb-3">
                        <div class="podium-avatar-dark">
                            <i class="fa-solid fa-user-astronaut"></i>
                        </div>
                        <div style="overflow:hidden;">
                            <div class="mono font-bold text-white text-sm flex items-center gap-1" title="${item.address}">
                                <span>${shortAddr}</span>
                                ${youTag}
                                <button class="btn btn-ghost btn-xs p-1" onclick="navigator.clipboard.writeText('${item.address}'); showToast('Address copied!')">
                                    <i class="fa-regular fa-copy text-slate-400"></i>
                                </button>
                            </div>
                            <div class="text-xs text-slate-300 font-mono font-bold mt-0.5">${tctxBal} $tCTX</div>
                        </div>
                    </div>

                    <div class="p-3 rounded-12 mb-3" style="background: rgba(11,15,25,0.75); border: 1px solid rgba(255,255,255,0.08);">
                        <div class="flex items-center justify-between text-xs text-slate-300 mb-1">
                            <span class="font-semibold">Mainnet Allocation:</span>
                            <span class="font-extrabold text-white mono text-base">${item.estimatedReward.toLocaleString()} <span class="text-xs text-indigo">CTX</span></span>
                        </div>
                        <div class="flex items-center justify-between text-xs text-slate-400 font-mono mb-2" style="font-size:0.75rem;">
                            <span>Day 1 (20%): <strong class="text-emerald font-bold">${item.day1Liquid} CTX</strong></span>
                            <span>Stream (80%): <strong class="text-cyan-400 font-bold">${item.vestedStream} CTX</strong></span>
                        </div>
                        <div class="peg-ratio-indicator" style="width: 100%; justify-content: center;">
                            <i class="fa-solid fa-scale-balanced text-amber"></i> 1,000 $tCTX = 1.00 $CTX Mainnet
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs text-slate-400 pt-2 font-mono" style="border-top: 1px solid rgba(255,255,255,0.08);">
                    <span>⛏️ ${item.blocksMined || 0} blks</span>
                    <span>⚡ ${item.stateCommits || 0} st</span>
                    <span>🔄 ${item.transfers || 0} txs</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterLeaderboard(filter, btnEl) {
    currentLeaderboardFilter = filter;
    document.querySelectorAll('.lb-filter-btn').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
    });
    if (btnEl) {
        btnEl.classList.add('active', 'btn-primary');
        btnEl.classList.remove('btn-outline');
    }
    renderLeaderboardTable();
}

function handleLeaderboardSearch(query) {
    currentLeaderboardSearch = (query || '').toLowerCase().trim();
    renderLeaderboardTable();
}

function simulateConversion(val) {
    const raw = parseFloat(val) || 0;
    // 1000 $tCTX = 1.00 Mainnet $CTX (Capped at 6,300 max)
    const mainnetCtx = Math.min(6300, +(raw / 1000).toFixed(4));
    const day1 = +(mainnetCtx * 0.20).toFixed(2);
    const stream = +(mainnetCtx * 0.80).toFixed(2);

    const elMain = document.getElementById('sim-mainnet-val');
    const elDay1 = document.getElementById('sim-day1-val');
    const elStream = document.getElementById('sim-stream-val');

    if (elMain) elMain.innerText = `${mainnetCtx.toLocaleString()} $CTX Mainnet`;
    if (elDay1) elDay1.innerText = `${day1.toLocaleString()} CTX`;
    if (elStream) elStream.innerText = `${stream.toLocaleString()} CTX`;
}

function simulateWithCurrentWallet() {
    if (!currentWallet || !currentWallet.address) {
        showToast('Please open or create a wallet first');
        return;
    }
    const bal = currentWallet.balance || 0;
    const input = document.getElementById('sim-input-tctx');
    if (input) {
        input.value = bal;
        simulateConversion(bal);
        showToast(`Loaded ${bal} $tCTX from connected wallet!`);
    }
}

function renderLeaderboardTable() {
    const tbody = document.getElementById('leaderboard-table-body');
    if (!tbody) return;

    let list = cachedLeaderboardData.filter(item => {
        if (currentLeaderboardFilter === 'miner' && item.type !== 'MINER' && item.type !== 'HYBRID') return false;
        if (currentLeaderboardFilter === 'tester' && item.type !== 'TESTER' && item.type !== 'HYBRID') return false;
        if (currentLeaderboardSearch) {
            return item.address.toLowerCase().includes(currentLeaderboardSearch);
        }
        return true;
    });

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:36px; color:var(--slate-400);">
                    <i class="fa-solid fa-circle-nodes text-indigo text-2xl mb-2"></i>
                    <div>No participants found matching current filter or search.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map((item, idx) => {
        const rank = item.rank || (idx + 1);
        let rankBadge = `<span class="mono font-bold text-slate-300" style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 8px;">#${rank}</span>`;
        if (rank === 1) rankBadge = `<span style="font-size:1.35rem; filter:drop-shadow(0 0 8px rgba(251,191,36,0.5));">🥇</span>`;
        else if (rank === 2) rankBadge = `<span style="font-size:1.35rem; filter:drop-shadow(0 0 8px rgba(56,189,248,0.5));">🥈</span>`;
        else if (rank === 3) rankBadge = `<span style="font-size:1.35rem; filter:drop-shadow(0 0 8px rgba(249,115,22,0.5));">🥉</span>`;

        let typeBadge = `<span class="pill-badge pill-violet-light font-mono text-xs">TESTER 🧪</span>`;
        if (item.type === 'MINER') {
            typeBadge = `<span class="pill-badge pill-green-light font-mono text-xs">MINER ⛏️</span>`;
        } else if (item.type === 'HYBRID') {
            typeBadge = `<span class="pill-badge pill-indigo-light font-mono text-xs">HYBRID ⚡</span>`;
        }

        const isMe = currentWallet && currentWallet.address && currentWallet.address.toLowerCase() === item.address.toLowerCase();
        const rowClass = isMe ? 'user-highlight-row' : '';
        const youTag = isMe ? '<span class="badge-you ml-1">YOU</span>' : '';

        const shortAddr = `${item.address.substring(0, 8)}...${item.address.substring(item.address.length - 6)}`;
        const tctxBal = (item.balance || (item.blocksMined * 50)).toLocaleString();

        return `
            <tr class="${rowClass}" style="border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.15s ease;">
                <td style="padding: 13px 10px; font-weight:700;">${rankBadge}</td>
                <td style="padding: 13px 10px;">
                    <div class="flex items-center gap-2">
                        <span class="user-identicon-dot" style="background: #${item.address.substring(4, 10)};"></span>
                        <span class="mono font-semibold" style="color:#818cf8;" title="${item.address}">${shortAddr}</span>
                        ${youTag}
                        <button class="btn btn-ghost btn-xs p-1" onclick="navigator.clipboard.writeText('${item.address}'); showToast('Address copied!')" title="Copy Address">
                            <i class="fa-regular fa-copy text-slate-400"></i>
                        </button>
                    </div>
                </td>
                <td style="padding: 13px 10px;">${typeBadge}</td>
                <td style="padding: 13px 10px;">
                    <div class="flex items-center gap-3 text-xs text-slate-400">
                        <span><strong class="text-amber mono">${item.blocksMined || 0}</strong> blks</span>
                        <span><strong class="text-indigo mono">${item.stateCommits || 0}</strong> st</span>
                        <span><strong class="text-emerald mono">${item.transfers || 0}</strong> txs</span>
                    </div>
                </td>
                <td style="padding: 13px 10px; text-align: right;">
                    <span class="mono font-bold text-white">${tctxBal}</span> <span class="text-xs text-slate-400 font-mono">$tCTX</span>
                </td>
                <td style="padding: 13px 10px; text-align: right;">
                    <div class="text-sm font-extrabold text-white mono">${item.estimatedReward.toLocaleString()} <span class="text-xs text-indigo">CTX</span></div>
                    <span class="text-xs text-slate-400 mono block" style="font-size:0.72rem;">1,000 : 1 peg</span>
                </td>
                <td style="padding: 13px 10px; text-align: right;">
                    <div class="text-xs mono">
                        <span class="text-emerald font-bold">20% (${item.day1Liquid} CTX) Day 1</span>
                    </div>
                    <div class="text-xs text-slate-400 mono">
                        <span>80% (${item.vestedStream} CTX) 90d Stream</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================================
// WEB3 PROVIDER INTEGRATION (window.cortex)
// ========================================================
const cortexWeb3State = {
    isConnected: false,
    address: null,
    balanceCtx: 0,
    balanceUsdc: 0
};

function initWeb3Wallet() {
    window.addEventListener('cortex#initialized', () => {
        checkWeb3AutoConnect();
    });

    if (localStorage.getItem('cortex_web3_connected') === 'true') {
        checkWeb3AutoConnect();
    }

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('web-wallet-dropdown');
        const pill = document.getElementById('web-wallet-connected-pill');
        if (dropdown && pill && !pill.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    setInterval(() => {
        if (cortexWeb3State.isConnected && !document.hidden) {
            syncWebWalletBalances();
        }
    }, 5000);
}

async function checkWeb3AutoConnect() {
    if (window.cortex && typeof window.cortex.request === 'function') {
        try {
            const accounts = await window.cortex.request({ method: 'ctx_accounts' });
            if (accounts && accounts.length > 0) {
                setWebWalletConnected(accounts[0]);
            }
        } catch(e) {}
    }
}

async function handleWebConnectClick() {
    if (!window.cortex || typeof window.cortex.request !== 'function') {
        openInstallModal();
        return;
    }

    try {
        const btn = document.getElementById('btn-web-connect-wallet');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

        const accounts = await window.cortex.request({ method: 'ctx_requestAccounts' });
        if (accounts && accounts.length > 0) {
            setWebWalletConnected(accounts[0]);
            showToast(`🟢 Connected: ${accounts[0].substring(0, 8)}...${accounts[0].substring(accounts[0].length - 4)}`);
        } else {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-wallet"></i> <span>Connect Wallet</span>';
        }
    } catch(err) {
        const btn = document.getElementById('btn-web-connect-wallet');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-wallet"></i> <span>Connect Wallet</span>';
        showToast(err.message || 'Connection rejected', true);
    }
}

async function setWebWalletConnected(address) {
    cortexWeb3State.isConnected = true;
    cortexWeb3State.address = address;
    localStorage.setItem('cortex_web3_connected', 'true');

    updateWebWalletHeader();
    await syncWebWalletBalances();
}

function disconnectWebWallet(e) {
    if (e) e.stopPropagation();
    cortexWeb3State.isConnected = false;
    cortexWeb3State.address = null;
    cortexWeb3State.balanceCtx = 0;
    cortexWeb3State.balanceUsdc = 0;
    localStorage.removeItem('cortex_web3_connected');

    const dropdown = document.getElementById('web-wallet-dropdown');
    if (dropdown) dropdown.classList.remove('show');

    updateWebWalletHeader();
    showToast('Portefeuille déconnecté');
}

function updateWebWalletHeader() {
    const btn = document.getElementById('btn-web-connect-wallet');
    const pill = document.getElementById('web-wallet-connected-pill');
    const addrEl = document.getElementById('web-wallet-addr-short');
    const balEl = document.getElementById('web-wallet-bal-badge');
    const mobileText = document.getElementById('mobile-connect-btn-text');

    if (cortexWeb3State.isConnected && cortexWeb3State.address) {
        const shortAddr = `${cortexWeb3State.address.substring(0, 6)}...${cortexWeb3State.address.substring(cortexWeb3State.address.length - 4)}`;
        if (btn) btn.style.display = 'none';
        if (pill) pill.style.display = 'inline-flex';
        if (addrEl) addrEl.textContent = shortAddr;
        if (balEl) balEl.textContent = `${cortexWeb3State.balanceCtx.toFixed(2)} CTX`;
        if (mobileText) mobileText.textContent = `${shortAddr} (${cortexWeb3State.balanceCtx.toFixed(2)} CTX)`;
    } else {
        if (btn) {
            btn.style.display = 'inline-flex';
            btn.innerHTML = '<i class="fa-solid fa-wallet"></i> <span>Connect Wallet</span>';
        }
        if (pill) pill.style.display = 'none';
        if (mobileText) mobileText.textContent = 'Connect Wallet';
    }
}

async function syncWebWalletBalances() {
    if (!cortexWeb3State.isConnected || !cortexWeb3State.address) return;
    try {
        const [balRes, dexRes] = await Promise.all([
            fetch(`/api/balance/${cortexWeb3State.address}`).then(r => r.json()).catch(() => ({ balance: 0 })),
            fetch(`/api/dex/balance/${cortexWeb3State.address}`).then(r => r.json()).catch(() => ({ ctx: 0, usdc: 1000 }))
        ]);

        cortexWeb3State.balanceCtx = typeof balRes.balance === 'number' ? balRes.balance : 0;
        cortexWeb3State.balanceUsdc = typeof dexRes.usdc === 'number' ? dexRes.usdc : 1000;

        const balEl = document.getElementById('web-wallet-bal-badge');
        if (balEl) balEl.textContent = `${cortexWeb3State.balanceCtx.toFixed(2)} CTX`;
    } catch(e) {}
}

function toggleWalletDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('web-wallet-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function copyConnectedWebAddress(e) {
    if (e) e.stopPropagation();
    if (!cortexWeb3State.address) return;
    navigator.clipboard.writeText(cortexWeb3State.address);
    showToast('✓ Adresse copiée dans le presse-papiers');
    const dropdown = document.getElementById('web-wallet-dropdown');
    if (dropdown) dropdown.classList.remove('show');
}

function openConnectedWebExplorer(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('web-wallet-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    if (typeof navigateTo === 'function') {
        navigateTo('explorer');
        const filterInput = document.getElementById('search-filter-input');
        if (filterInput && cortexWeb3State.address) {
            filterInput.value = cortexWeb3State.address;
            if (typeof filterBlocks === 'function') filterBlocks();
        }
    }
}

function openInstallModal() {
    const m = document.getElementById('modal-install-extension');
    if (m) m.style.display = 'flex';
}

function closeInstallModal(e) {
    if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close-modal')) return;
    const m = document.getElementById('modal-install-extension');
    if (m) m.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    initDex();
    initWeb3Wallet();
    fetchAndRenderLeaderboard();
    setInterval(fetchAndRenderLeaderboard, 10000);
});



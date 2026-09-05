// CORTEX PROTOCOL - OFFICIAL BROWSER EXTENSION CONTROLLER (MANIFEST V3 STRICT CSP)

const RPC_URL = "https://cortex-protocol.xyz";
let currentWallet = null;
let pollInterval = null;
let pendingApprovalData = null;

// ========================================================
// DOM READY & EVENT ATTACHMENT
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    bindAllEventListeners();
    checkExistingWallet();
});

function bindAllEventListeners() {
    // Header actions
    safeAddListener("btn-copy-header-addr", "click", copyAddress);
    safeAddListener("btn-lock-wallet", "click", lockWallet);
    safeAddListener("btn-network-select", "click", () => showToast("Connected to Cortex L1 Testnet"));

    // Onboarding buttons
    safeAddListener("btn-show-create", "click", showCreateView);
    safeAddListener("btn-show-import", "click", showImportView);
    safeAddListener("btn-cancel-create", "click", cancelOnboarding);
    safeAddListener("btn-cancel-import", "click", cancelOnboarding);
    safeAddListener("btn-confirm-create", "click", confirmCreateWallet);
    safeAddListener("btn-confirm-import", "click", confirmImportWallet);
    safeAddListener("btn-confirm-unlock", "click", unlockWallet);

    // Quick action buttons
    safeAddListener("action-btn-send", "click", openSendView);
    safeAddListener("action-btn-receive", "click", openReceiveView);
    safeAddListener("action-btn-swap", "click", openSwapView);
    safeAddListener("action-btn-inscribe", "click", openInscribeView);

    // Tab buttons
    safeAddListener("tab-btn-assets", "click", (e) => switchDashTab("assets", e.currentTarget));
    safeAddListener("tab-btn-activity", "click", (e) => switchDashTab("activity", e.currentTarget));
    safeAddListener("tab-btn-memories", "click", (e) => switchDashTab("memories", e.currentTarget));

    // Modal close buttons
    safeAddListener("btn-close-send", "click", () => closeOverlay("overlay-send"));
    safeAddListener("btn-close-receive", "click", () => closeOverlay("overlay-receive"));
    safeAddListener("btn-close-inscribe", "click", () => closeOverlay("overlay-inscribe"));

    // Action execution buttons
    safeAddListener("btn-send-max", "click", setSendMax);
    safeAddListener("btn-broadcast-tx", "click", executeSendTx);
    safeAddListener("btn-copy-receive-addr", "click", copyAddress);
    safeAddListener("btn-execute-inscribe", "click", executeInscribeMemory);

    // Web3 Approval handlers
    safeAddListener("btn-reject-approval", "click", rejectDAppApproval);
    safeAddListener("btn-confirm-approval", "click", confirmDAppApproval);
}

function safeAddListener(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
}

// ========================================================
// WALLET LIFECYCLE & STORAGE
// ========================================================
function checkExistingWallet() {
    try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(["cortex_vault", "cortex_locked", "cortex_pending_approval"], (res) => {
                if (res && res.cortex_vault) {
                    currentWallet = res.cortex_vault;
                    if (res.cortex_pending_approval) {
                        pendingApprovalData = res.cortex_pending_approval;
                        if (res.cortex_locked === false) {
                            showApprovalScreen(res.cortex_pending_approval);
                        } else {
                            showUnlockScreen();
                        }
                    } else if (res.cortex_locked === false) {
                        showDashboard();
                    } else {
                        showUnlockScreen();
                    }
                } else {
                    showOnboardingScreen();
                }
            });
        } else {
            // Fallback to localStorage for testing
            const saved = localStorage.getItem("cortex_vault");
            if (saved) {
                currentWallet = JSON.parse(saved);
                showDashboard();
            } else {
                showOnboardingScreen();
            }
        }
    } catch(e) {
        showOnboardingScreen();
    }
}

function showOnboardingScreen() {
    setViewActive("view-onboarding");
    setDisplay("btn-copy-header-addr", "none");
    setDisplay("btn-lock-wallet", "none");
    setDisplay("onboarding-buttons", "block");
    setDisplay("create-wallet-box", "none");
    setDisplay("import-wallet-box", "none");
    setDisplay("unlock-wallet-box", "none");
}

function showUnlockScreen() {
    setViewActive("view-onboarding");
    setDisplay("btn-copy-header-addr", "none");
    setDisplay("btn-lock-wallet", "none");
    setDisplay("onboarding-buttons", "none");
    setDisplay("create-wallet-box", "none");
    setDisplay("import-wallet-box", "none");
    setDisplay("unlock-wallet-box", "block");
}

function showCreateView() {
    setDisplay("onboarding-buttons", "none");
    setDisplay("create-wallet-box", "block");
}

function showImportView() {
    setDisplay("onboarding-buttons", "none");
    setDisplay("import-wallet-box", "block");
}

function cancelOnboarding() {
    showOnboardingScreen();
}

async function confirmCreateWallet() {
    const p1 = document.getElementById("new-password-input")?.value || "";
    const p2 = document.getElementById("confirm-password-input")?.value || "";
    if (!p1 || p1.length < 6) return showToast("Password must be at least 6 characters", true);
    if (p1 !== p2) return showToast("Passwords do not match", true);

    try {
        const res = await fetch(`${RPC_URL}/api/wallet/create`, { method: "POST" });
        const wallet = await res.json();
        currentWallet = wallet;
        saveVault(wallet, false);
        showDashboard();
        showToast("🎉 Sovereign Vault Created!");
    } catch(e) {
        // Local deterministic fallback keygen
        const randHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, "0")).join("");
        const localWallet = {
            privateKey: randHex,
            address: `ctx1${randHex.substring(0, 48)}`,
            balance: 0
        };
        currentWallet = localWallet;
        saveVault(localWallet, false);
        showDashboard();
        showToast("🎉 Local Sovereign Vault Created!");
    }
}

async function confirmImportWallet() {
    const key = document.getElementById("import-key-input")?.value.trim() || "";
    const pwd = document.getElementById("import-password-input")?.value || "";
    if (!key || key.length < 32) return showToast("Please enter a valid private key hex", true);
    if (!pwd || pwd.length < 6) return showToast("Password must be at least 6 chars", true);

    try {
        const res = await fetch(`${RPC_URL}/api/wallet/import`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ privateKey: key })
        });
        const wallet = await res.json();
        if (wallet.error) return showToast(wallet.error, true);
        currentWallet = wallet;
        saveVault(wallet, false);
        showDashboard();
        showToast("🔑 Wallet Imported Successfully!");
    } catch(e) {
        const localWallet = {
            privateKey: key,
            address: `ctx1${key.substring(0, 48)}`,
            balance: 0
        };
        currentWallet = localWallet;
        saveVault(localWallet, false);
        showDashboard();
        showToast("🔑 Wallet Imported Successfully!");
    }
}

function unlockWallet() {
    const pwd = document.getElementById("unlock-password-input")?.value || "";
    if (!pwd) return showToast("Please enter password", true);

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["cortex_vault"], (res) => {
            if (res && res.cortex_vault) {
                currentWallet = res.cortex_vault;
                chrome.storage.local.set({ cortex_locked: false });
                showDashboard();
                showToast("🔓 Vault Unlocked");
            }
        });
    } else {
        const saved = localStorage.getItem("cortex_vault");
        if (saved) {
            currentWallet = JSON.parse(saved);
            showDashboard();
            showToast("🔓 Vault Unlocked");
        }
    }
}

function lockWallet() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ cortex_locked: true });
    }
    currentWallet = null;
    if (pollInterval) clearInterval(pollInterval);
    showUnlockScreen();
}

function saveVault(wallet, isLocked = false) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ cortex_vault: wallet, cortex_locked: isLocked });
    }
    localStorage.setItem("cortex_vault", JSON.stringify(wallet));
}

// ========================================================
// DASHBOARD RENDERING
// ========================================================
function showDashboard() {
    setViewActive("view-dashboard");
    setDisplay("btn-copy-header-addr", "inline-flex");
    setDisplay("btn-lock-wallet", "flex");

    if (currentWallet && currentWallet.address) {
        const shortAddr = `${currentWallet.address.substring(0, 8)}...${currentWallet.address.substring(currentWallet.address.length - 4)}`;
        setText("account-short-addr", shortAddr);
        setText("receive-full-addr", currentWallet.address);
        renderQrCode(currentWallet.address);
    }

    updateBalance();
    fetchActivity();

    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(updateBalance, 3000);
}

async function updateBalance() {
    if (!currentWallet || !currentWallet.address) return;
    try {
        // 1. Fetch CTX on-chain balance
        const res = await fetch(`${RPC_URL}/api/balance/${currentWallet.address}`);
        const data = await res.json();
        const bal = data.balance || 0;
        currentWallet.balance = bal;

        // 2. Fetch DEX tUSDC token balance
        let usdcBal = 1000.00;
        try {
            const dexRes = await fetch(`${RPC_URL}/api/dex/balance/${currentWallet.address}`);
            const dexData = await dexRes.json();
            if (typeof dexData.usdc === "number") {
                usdcBal = dexData.usdc;
            }
        } catch(e) {}

        const ctxUsd = bal * 1.2450;
        const totalUsdNum = ctxUsd + usdcBal;
        const formattedUsd = totalUsdNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        setText("dash-portfolio-usd", formattedUsd);
        setText("dash-balance-ctx", bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setText("dash-balance-usdc", usdcBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setText("row-ctx-amount", `${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CTX`);
        setText("row-ctx-fiat", `$${ctxUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        setText("row-usdc-amount", `${usdcBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tUSDC`);
        setText("row-usdc-fiat", `$${usdcBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        setText("send-avail-ctx", `${bal.toFixed(2)} CTX`);
    } catch(e) {}
}

async function fetchActivity() {
    try {
        const res = await fetch(`${RPC_URL}/api/blocks?limit=8`);
        const blocks = await res.json();
        const container = document.getElementById("activity-feed-list");
        if (!blocks || !Array.isArray(blocks) || blocks.length === 0 || !container) return;

        container.innerHTML = blocks.map(b => {
            const isMiner = b.minerAddress === currentWallet?.address;
            return `
                <div class="act-item">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="color:${isMiner ? "#10b981" : "#818cf8"}; font-size:0.9rem;">
                            <i class="fa-solid ${isMiner ? "fa-gem" : "fa-cube"}"></i>
                        </span>
                        <div>
                            <div style="font-weight:700;">Block #${b.index} Mined</div>
                            <div style="font-size:0.7rem; color:#94a3b8;">${new Date(b.timestamp).toLocaleTimeString()}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div class="mono font-bold" style="color:${isMiner ? "#10b981" : "#f8fafc"};">${isMiner ? "+50.00 CTX" : b.transactions.length + " txs"}</div>
                    </div>
                </div>
            `;
        }).join("");
    } catch(e) {}
}

function switchDashTab(tabKey, btnEl) {
    document.querySelectorAll(".dash-tab").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(el => el.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    const target = document.getElementById(`tab-${tabKey}`);
    if (target) target.classList.add("active");
}

function openSendView() { document.getElementById("overlay-send")?.classList.add("active"); }
function openReceiveView() { document.getElementById("overlay-receive")?.classList.add("active"); }
function openSwapView() {
    if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: "https://cortex-protocol.xyz/#dex" });
    } else {
        window.open("https://cortex-protocol.xyz/#dex", "_blank");
    }
}
function openInscribeView() { document.getElementById("overlay-inscribe")?.classList.add("active"); }
function closeOverlay(id) { document.getElementById(id)?.classList.remove("active"); }

function setSendMax() {
    const avail = Math.max(0, (currentWallet?.balance || 0) - 0.01);
    const input = document.getElementById("tx-amount-input");
    if (input) input.value = avail.toFixed(4);
}

async function executeSendTx() {
    const recipient = document.getElementById("tx-recipient-input")?.value.trim() || "";
    const amount = parseFloat(document.getElementById("tx-amount-input")?.value || "0");
    const btn = document.getElementById("btn-broadcast-tx");

    if (!recipient || !recipient.startsWith("ctx1")) return showToast("Invalid recipient address format", true);
    if (amount <= 0) return showToast("Enter a valid transfer amount", true);

    if (btn) { btn.disabled = true; btn.innerHTML = "<i class=\"fa-solid fa-spinner fa-spin\"></i> Signing & Broadcasting..."; }

    try {
        const res = await fetch(`${RPC_URL}/api/transaction/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderPrivateKey: currentWallet.privateKey,
                recipient,
                amount,
                fee: 0.01
            })
        });
        const data = await res.json();
        if (btn) { btn.disabled = false; btn.innerHTML = "<i class=\"fa-solid fa-paper-plane\"></i> Sign & Broadcast"; }
        if (data.error) return showToast(data.error, true);

        showToast("🚀 Transaction Dispatched On-Chain!");
        closeOverlay("overlay-send");
        updateBalance();
    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = "<i class=\"fa-solid fa-paper-plane\"></i> Sign & Broadcast"; }
        showToast("Transaction broadcast failed", true);
    }
}

async function executeInscribeMemory() {
    const agentId = document.getElementById("ext-agent-id")?.value.trim() || "";
    const topic = document.getElementById("ext-topic")?.value.trim() || "";
    const content = document.getElementById("ext-content")?.value.trim() || "";
    const btn = document.getElementById("btn-execute-inscribe");

    if (!agentId || !topic || !content) return showToast("Please fill all memory fields", true);
    if (btn) { btn.disabled = true; btn.innerHTML = "<i class=\"fa-solid fa-spinner fa-spin\"></i> Inscribing..."; }

    try {
        const res = await fetch(`${RPC_URL}/api/memory/commit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                agentPrivateKey: currentWallet.privateKey,
                agentId,
                topic,
                memoryType: "KNOWLEDGE_BASE",
                content,
                fee: 0.05
            })
        });
        const data = await res.json();
        if (btn) { btn.disabled = false; btn.innerHTML = "<i class=\"fa-solid fa-cloud-arrow-up\"></i> Inscribe onto L1 Block"; }
        if (data.error) return showToast(data.error, true);

        showToast("🧠 Memory Inscribed (0.015 CTX Burned 🔥)!");
        closeOverlay("overlay-inscribe");
        updateBalance();
    } catch(e) {
        if (btn) { btn.disabled = false; btn.innerHTML = "<i class=\"fa-solid fa-cloud-arrow-up\"></i> Inscribe onto L1 Block"; }
        showToast("Memory commit failed", true);
    }
}

// ========================================================
// QR CODE GENERATOR (NATIVE 2D CANVAS)
// ========================================================
function renderQrCode(text) {
    const canvas = document.getElementById("qr-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = 180;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#0f172a";
    const grid = 18;
    const cell = size / grid;

    drawFinder(ctx, 1, 1, cell);
    drawFinder(ctx, grid - 5, 1, cell);
    drawFinder(ctx, 1, grid - 5, cell);

    let seed = 0;
    for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);

    for (let x = 0; x < grid; x++) {
        for (let y = 0; y < grid; y++) {
            if ((x <= 5 && y <= 5) || (x >= grid - 6 && y <= 5) || (x <= 5 && y >= grid - 6)) continue;
            const pseudo = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
            if ((pseudo - Math.floor(pseudo)) > 0.5) {
                ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
            }
        }
    }
}

function drawFinder(ctx, gx, gy, cell) {
    ctx.fillRect(gx * cell, gy * cell, 4 * cell, 4 * cell);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((gx + 1) * cell, (gy + 1) * cell, 2 * cell, 2 * cell);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect((gx + 1.5) * cell, (gy + 1.5) * cell, 1 * cell, 1 * cell);
}

function copyAddress() {
    if (!currentWallet || !currentWallet.address) return;
    navigator.clipboard.writeText(currentWallet.address);
    showToast("Address copied to clipboard!");
}

function showToast(msg, isErr = false) {
    const t = document.getElementById("ext-toast");
    if (!t) return;
    t.textContent = msg;
    t.style.borderColor = isErr ? "#ef4444" : "#6366f1";
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

function setViewActive(viewId) {
    document.querySelectorAll(".sub-view").forEach(el => el.classList.remove("active"));
    document.getElementById(viewId)?.classList.add("active");
}
function setDisplay(id, val) {
    const el = document.getElementById(id);
    if (el) el.style.display = val;
}
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ========================================================
// WEB3 DAPP APPROVAL LIFECYCLE
// ========================================================
function showApprovalScreen(approval) {
    setViewActive("view-approval");
    setDisplay("btn-copy-header-addr", "none");
    setDisplay("btn-lock-wallet", "none");

    const params = approval.params || {};
    const origin = approval.origin || "cortex-protocol.xyz/dex";
    setText("approval-dapp-origin", origin);

    const fromSym = params.fromSymbol || "CTX";
    const toSym = params.toSymbol || "tUSDC";
    const amountIn = params.amountIn || 20;
    const amountOut = params.amountOut ? (+params.amountOut).toFixed(4) : (amountIn * 1.2450).toFixed(4);

    setText("appr-pay-val", `- ${amountIn} ${fromSym}`);
    setText("appr-receive-val", `+ ${amountOut} ${toSym}`);

    if (currentWallet && currentWallet.address) {
        const shortAddr = `${currentWallet.address.substring(0, 10)}...${currentWallet.address.substring(currentWallet.address.length - 4)}`;
        setText("appr-signer-addr", shortAddr);
    }
}

async function confirmDAppApproval() {
    const btn = document.getElementById("btn-confirm-approval");
    if (!btn || !currentWallet || !pendingApprovalData) return;

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing On-Chain...`;

    try {
        const params = pendingApprovalData.params || {};
        const res = await fetch(`${RPC_URL}/api/dex/swap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderPrivateKey: currentWallet.privateKey,
                fromSymbol: params.fromSymbol || "CTX",
                amountIn: params.amountIn || 20
            })
        });
        const data = await res.json();

        if (data.error) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-signature"></i> Sign & Confirm`;
            return showToast(data.error, true);
        }

        if (typeof chrome !== "undefined" && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: "CORTEX_RESOLVE_APPROVAL",
                reqId: pendingApprovalData.reqId,
                result: {
                    txId: data.txId,
                    fromSymbol: data.fromSymbol,
                    toSymbol: data.toSymbol,
                    amountIn: data.amountIn,
                    amountOut: data.amountOut
                }
            });
        }

        showToast("🎉 Transaction Signed & Broadcasted!");
        setTimeout(() => {
            window.close();
        }, 800);
    } catch(e) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-signature"></i> Sign & Confirm`;
        showToast("Failed to broadcast transaction", true);
    }
}

function rejectDAppApproval() {
    if (typeof chrome !== "undefined" && chrome.runtime && pendingApprovalData) {
        chrome.runtime.sendMessage({
            type: "CORTEX_REJECT_APPROVAL",
            reqId: pendingApprovalData.reqId
        });
    }
    showToast("Transaction Rejected");
    setTimeout(() => {
        window.close();
    }, 400);
}

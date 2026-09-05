// CORTEX PROTOCOL - BACKGROUND SERVICE WORKER (MANIFEST V3)

chrome.runtime.onInstalled.addListener(() => {
    console.log("🧠 Cortex Wallet Extension v1.0.0 Installed!");
});

// Map of pending dApp approval requests: reqId -> { sender, sendResponse, payload }
const pendingRequests = new Map();
let currentReqId = 0;

// Handle messages from content scripts / dApps / popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. DApp requests accounts
    if (request.type === "CORTEX_REQUEST_ACCOUNTS") {
        chrome.storage.local.get(["cortex_vault", "cortex_locked"], (res) => {
            if (res.cortex_vault && res.cortex_locked === false) {
                sendResponse({ success: true, accounts: [res.cortex_vault.address] });
            } else {
                const reqId = ++currentReqId;
                pendingRequests.set(reqId, { sendResponse, requestType: "CONNECT" });
                chrome.storage.local.set({ cortex_pending_approval: { reqId, type: "CONNECT", origin: sender.origin || "cortex-protocol.xyz" } });
                
                chrome.windows.create({
                    url: chrome.runtime.getURL(`popup.html?approval=${reqId}`),
                    type: "popup",
                    width: 375,
                    height: 600,
                    focused: true
                });
            }
        });
        return true;
    }

    // 2. DApp requests status
    if (request.type === "CORTEX_GET_STATUS") {
        chrome.storage.local.get(["cortex_vault", "cortex_locked"], (res) => {
            sendResponse({
                isInstalled: true,
                isUnlocked: !!(res.cortex_vault && res.cortex_locked === false),
                address: res.cortex_vault ? res.cortex_vault.address : null
            });
        });
        return true;
    }

    // 3. DApp requests transaction / swap signature approval
    if (request.type === "CORTEX_SIGN_TRANSACTION" || request.type === "CORTEX_SIGN_SWAP") {
        const reqId = ++currentReqId;
        pendingRequests.set(reqId, { sendResponse, requestType: request.type, payload: request.params || request.payload });
        
        chrome.storage.local.set({
            cortex_pending_approval: {
                reqId,
                type: request.type,
                params: request.params || request.payload,
                origin: sender.origin || "cortex-protocol.xyz"
            }
        });

        chrome.windows.create({
            url: chrome.runtime.getURL(`popup.html?approval=${reqId}`),
            type: "popup",
            width: 375,
            height: 600,
            focused: true
        });
        return true;
    }

    // 4. Popup resolves approval
    if (request.type === "CORTEX_RESOLVE_APPROVAL") {
        const pending = pendingRequests.get(request.reqId);
        if (pending) {
            pending.sendResponse({ success: true, ...request.result });
            pendingRequests.delete(request.reqId);
        }
        chrome.storage.local.remove("cortex_pending_approval");
        sendResponse({ success: true });
        return true;
    }

    // 5. Popup rejects approval
    if (request.type === "CORTEX_REJECT_APPROVAL") {
        const pending = pendingRequests.get(request.reqId);
        if (pending) {
            pending.sendResponse({ success: false, error: "User rejected transaction in Cortex Wallet" });
            pendingRequests.delete(request.reqId);
        }
        chrome.storage.local.remove("cortex_pending_approval");
        sendResponse({ success: true });
        return true;
    }
});

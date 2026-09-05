// CORTEX PROTOCOL - INPAGE WEB3 PROVIDER (window.cortex)
// Conforms to modern EIP-1193 style async request API

(function() {
    let requestId = 0;
    const callbacks = new Map();
    const eventListeners = new Map();

    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data || event.data.target !== "CORTEX_CONTENT") return;
        
        if (event.data.event) {
            const handlers = eventListeners.get(event.data.event) || [];
            handlers.forEach(fn => fn(event.data.data));
            return;
        }

        const cb = callbacks.get(event.data.id);
        if (cb) {
            callbacks.delete(event.data.id);
            if (event.data.response && event.data.response.success) {
                cb.resolve(event.data.response);
            } else {
                cb.reject(new Error(event.data.response?.error || "Cortex operation failed"));
            }
        }
    });

    function callExtension(payload) {
        return new Promise((resolve, reject) => {
            const id = ++requestId;
            callbacks.set(id, { resolve, reject });
            window.postMessage({ target: "CORTEX_INPAGE", id, payload }, "*");
        });
    }

    const cortexProvider = {
        isCortex: true,
        version: "2.2.0",
        network: "Cortex Layer-1 Testnet",
        chainId: "0x435458", // 'CTX' in hex

        async isConnected() {
            try {
                const res = await callExtension({ type: "CORTEX_GET_STATUS" });
                return !!(res && res.isUnlocked && res.address);
            } catch(e) {
                return false;
            }
        },

        async request(args) {
            if (!args || !args.method) throw new Error("Invalid request arguments: method required");

            switch (args.method) {
                case "ctx_requestAccounts":
                case "eth_requestAccounts": {
                    const res = await callExtension({ type: "CORTEX_REQUEST_ACCOUNTS" });
                    return res.accounts || [];
                }
                case "ctx_accounts":
                case "eth_accounts": {
                    const res = await callExtension({ type: "CORTEX_GET_STATUS" });
                    return (res && res.address) ? [res.address] : [];
                }
                case "ctx_signSwap": {
                    const res = await callExtension({ type: "CORTEX_SIGN_SWAP", params: args.params });
                    return res;
                }
                case "ctx_inscribeMemory": {
                    const res = await callExtension({ type: "CORTEX_INSCRIBE_MEMORY", params: args.params });
                    return res;
                }
                case "ctx_sendTransaction":
                case "eth_sendTransaction": {
                    const res = await callExtension({ type: "CORTEX_SIGN_TRANSACTION", params: args.params });
                    return res;
                }
                case "ctx_chainId":
                case "eth_chainId":
                    return "0x435458";
                default:
                    throw new Error(`Method ${args.method} not supported by Cortex Wallet`);
            }
        },

        on(event, handler) {
            if (!eventListeners.has(event)) eventListeners.set(event, []);
            eventListeners.get(event).push(handler);
        },

        removeListener(event, handler) {
            if (!eventListeners.has(event)) return;
            const list = eventListeners.get(event).filter(fn => fn !== handler);
            eventListeners.set(event, list);
        }
    };

    window.cortex = cortexProvider;
    window.dispatchEvent(new Event("cortex#initialized"));
    console.log("🧠 [Cortex Web3] window.cortex v2.2.0 ready");
})();

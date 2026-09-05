// CORTEX PROTOCOL - INPAGE WEB3 PROVIDER (window.cortex)
// Conforms to modern EIP-1193 style async request API

(function() {
    let requestId = 0;
    const callbacks = new Map();

    window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data || event.data.target !== "CORTEX_CONTENT") return;
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
        version: "1.0.0",
        network: "Cortex Layer-1 Testnet",
        chainId: "0x435458", // 'CTX' in hex

        async request(args) {
            if (!args || !args.method) throw new Error("Invalid request arguments");

            switch (args.method) {
                case "ctx_requestAccounts":
                case "eth_requestAccounts": {
                    const res = await callExtension({ type: "CORTEX_REQUEST_ACCOUNTS" });
                    return res.accounts;
                }
                case "ctx_accounts":
                case "eth_accounts": {
                    const res = await callExtension({ type: "CORTEX_GET_STATUS" });
                    return res.address ? [res.address] : [];
                }
                case "ctx_signSwap": {
                    const res = await callExtension({ type: "CORTEX_SIGN_SWAP", params: args.params });
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
                    throw new Error(`Method ${args.method} not implemented in Cortex Extension v1.0.0`);
            }
        }
    };

    window.cortex = cortexProvider;
    console.log("🧠 [Cortex Web3] window.cortex injected successfully!");
})();

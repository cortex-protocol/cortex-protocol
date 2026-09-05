// CORTEX PROTOCOL - CONTENT SCRIPT
// Injects inpage.js into the DOM to provide window.cortex

function injectScript() {
    try {
        const container = document.head || document.documentElement;
        const script = document.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", chrome.runtime.getURL("inpage.js"));
        container.insertBefore(script, container.children[0]);
        container.removeChild(script);
    } catch (e) {
        console.error("Cortex script injection failed:", e);
    }
}

injectScript();

// Forward window.postMessage to background worker
window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.target !== "CORTEX_INPAGE") return;

    chrome.runtime.sendMessage(event.data.payload, (response) => {
        window.postMessage({
            target: "CORTEX_CONTENT",
            id: event.data.id,
            response
        }, "*");
    });
});

// web/src/preview/injected_hym_client.js

console.log("[Injected Hot Reload Client] Initializing...");

window.addEventListener("message", (event) => {
    // Only accept messages from the parent window
    if (event.source !== window.parent) {
        return;
    }

    const message = event.data;
    console.log("[Injected Hot Reload Client] Received message:", message);

    if (message.Reload) {
        console.log(`[Injected Hot Reload Client] Full reload triggered by change in: ${message.Reload.path}`);
        window.location.reload(true);
    } else if (message.CssUpdate) {
        console.log(`[Injected Hot Reload Client] CSS update triggered by change in: ${message.CssUpdate.path}`);
        const changedPath = message.CssUpdate.path;

        let found = false;
        // Iterate over all link tags to find the one that matches the changed CSS file
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
            // Normalize paths for comparison: remove leading slash if present in changedPath for comparison
            const linkHref = new URL(link.href).pathname;
            const normalizedChangedPath = changedPath.startsWith('/') ? changedPath.substring(1) : changedPath;
            // The link href will be something like "/project/main.css" while changedPath from watcher is "main.css" or "src/main.css"
            // We need to compare the end of the path
            if (linkHref.endsWith(normalizedChangedPath)) {
                // To force a reload, append a new timestamp query parameter
                const newHref = `${linkHref.split('?')[0]}?_ts=${new Date().getTime()}`;
                console.log(`[Injected Hot Reload Client] Updating CSS: ${link.href} -> ${newHref}`);
                link.href = newHref;
                found = true;
            }
        }

        if (!found) {
            console.warn(`[Injected Hot Reload Client] No matching stylesheet found for ${changedPath}. Falling back to full reload.`);
            window.location.reload(true);
        }
    }
});

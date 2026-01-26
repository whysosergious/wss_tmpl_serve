// web/src/preview/injected_hym_client.js

console.log("[Injected Hot Reload Client] Initializing...");

window.addEventListener("message", (event) => {
    // Only accept messages from the parent window
    if (event.source !== window.parent) {
        return;
    }

    const message = event.data;
    console.log("[Injected Hot Reload Client] Received message:", message);

    if (message.message_type === "reload") {
        console.log(`[Injected Hot Reload Client] Full reload triggered by change in: ${message.body}`);
        window.location.reload(true);
    } else if (message.message_type === "css_update") {
        console.log(`[Injected Hot Reload Client] CSS update triggered by change in: ${message.body}`);
        const changedPath = message.body;

        let found = false;
        // Iterate over all link tags to find the one that matches the changed CSS file
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
            // Normalize paths for comparison: remove leading slash if present in changedPath for comparison
            // The link href will be something like "http://127.0.0.1:8080/project/main.css" while changedPath from watcher is "/main.css"
            const linkUrl = new URL(link.href);
            const linkPathname = linkUrl.pathname;
            const normalizedChangedPath = changedPath.startsWith('/') ? changedPath : `/project${changedPath}`; // Assuming project files are served under /project

            // Compare the end of the path
            if (linkPathname.endsWith(normalizedChangedPath) || linkPathname.endsWith(`/project${changedPath}`)) {
                // To force a reload, append a new timestamp query parameter
                const newHref = `${linkUrl.origin}${linkPathname}?_ts=${new Date().getTime()}`;
                console.log(`[Injected Hot Reload Client] Updating CSS: ${link.href} -> ${newHref}`);
                link.href = newHref;
                found = true;
                break; // Only update the first matching link
            }
        }

        if (!found) {
            console.warn(`[Injected Hot Reload Client] No matching stylesheet found for ${changedPath}. Falling back to full reload.`);
            window.location.reload(true);
        }
    }
});

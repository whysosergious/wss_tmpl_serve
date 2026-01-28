import { decodeMulti } from "https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.1.3/dist.esm/index.mjs";

globalThis.__hmr_cache = new Map();

class HMRClient {
  constructor() {
    window.__hmr_cache = window.__hmr_cache || new Map();
    this.lastReloads = new Map();

    this.ws = new WebSocket(`ws://${location.host}/ws/`);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = (e) => this.handleMsgpack(e.data);
  }

  handleMsgpack(arrayBuffer) {
    const messages = decodeMulti(new Uint8Array(arrayBuffer));
    messages.forEach((msg) => this.handleHmrEvent(msg));
  }

  handleHmrEvent(msg) {
    // Debounce
    const key = `${msg.type}:${msg.body}`;
    const now = Date.now();
    if (this.lastReloads.has(key) && now - this.lastReloads.get(key) < 500)
      return;
    this.lastReloads.set(key, now);

    console.log("🔥 HMR:", msg.type, msg.body);

    switch (msg.type) {
      case "hmr::css_update":
        this.reloadCSS(msg.body);
        break;
      case "hmr::js_update":
        this.reloadJS(msg.body);
        break;
    }
  }

  reloadCSS(path) {
    document.querySelectorAll('link[href*=".css"]').forEach((link) => {
      link.href += `?t=${Date.now()}`;
    });
  }

  reloadJS(path) {
    console.log("🔄 HMR JS update:", path);

    // Map relative file path to dev-server URL
    const url = `${path}`; // adjust if your route is different

    // Bust ESM cache by appending timestamp
    const hmrUrl = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();

    console.log("📦 HMR importing:", hmrUrl);

    import(hmrUrl)
      .then((mod) => {
        console.log("✅ HMR module reloaded:", hmrUrl);
        // Later: call accept handlers / patch state instead of doing nothing.
      })
      .catch((err) => {
        console.warn("⚠️ HMR failed, doing full reload", err);
        window.location.reload();
      });
  }

  bustModuleCache() {
    // ESM modules cached forever → force full reload
    console.log("💥 ESM cache bust - full reload");
    window.location.reload(); // NUCLEAR OPTION - works 100%
  }
}

new HMRClient();

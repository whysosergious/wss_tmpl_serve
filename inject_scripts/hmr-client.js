import { decodeMulti } from "https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.1.3/dist.esm/index.mjs";

globalThis.__hmr_cache = new Map();

class HMRClient {
  constructor() {
    window.__hmr_cache = window.__hmr_cache || new Map();
    this.lastReloads = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // ms, grows exponentially

    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`ws://${location.host}/ws/`);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      console.log("🔗 HMR connected");
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    };

    this.ws.onmessage = (e) => this.handleMsgpack(e.data);
    this.ws.onclose = () => this.handleDisconnect();
    this.ws.onerror = (e) => {
      console.warn("🔌 HMR WS error:", e);
      this.handleDisconnect();
    };
  }

  handleDisconnect() {
    console.warn("🔌 HMR disconnected, reconnecting...");

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(
          `🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        );
        this.connect();
      }, this.reconnectDelay);

      // Exponential backoff: 1s, 2s, 4s, 8s...
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // cap at 30s
    } else {
      console.error("💥 HMR max reconnects reached. Reloading page...");
      window.location.reload();
    }
  }

  handleMsgpack(arrayBuffer) {
    const messages = decodeMulti(new Uint8Array(arrayBuffer));
    messages.forEach((msg) => this.handleHmrEvent(msg));
  }

  handleHmrEvent(msg) {
    // Debounce
    const key = `${msg.type}:${msg.body}`;
    if (!msg.body.startsWith("/project/")) return;
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

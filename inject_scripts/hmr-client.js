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
    console.log("🔄 Full JS reload:", path);

    // 1. Reload script tags
    document.querySelectorAll('script[type="module"]').forEach((script) => {
      const newScript = document.createElement("script");
      newScript.src = script.src.split("?")[0] + `?t=${Date.now()}`;
      newScript.type = "module";
      newScript.crossOrigin = "anonymous";

      newScript.onload = () => {
        console.log("✅ Script tag reloaded");
        script.remove();
      };

      script.parentNode.insertBefore(newScript, script);
    });

    // 2. Force module cache bust (NUCLEAR)
    this.bustModuleCache();
  }

  bustModuleCache() {
    // ESM modules cached forever → force full reload
    console.log("💥 ESM cache bust - full reload");
    window.location.reload(); // NUCLEAR OPTION - works 100%
  }
}

new HMRClient();

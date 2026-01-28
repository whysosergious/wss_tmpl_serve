import { decodeMulti } from "/web/src/lib.js";

class HMRClient {
  constructor() {
    this.ws = new WebSocket(`ws://${location.host}/ws/`);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => console.log("🔥 HMR WebSocket connected");
    this.ws.onmessage = (event) => this.handleMsgpack(event.data);
    this.ws.onclose = () => {
      console.log("🔥 HMR WS disconnected - reconnecting...");
      setTimeout(() => new HMRClient(), 1000);
    };
  }

  handleMsgpack(arrayBuffer) {
    try {
      const messages = decodeMulti(new Uint8Array(arrayBuffer));
      messages.forEach((msg) => this.handleHmrEvent(msg));
    } catch (e) {
      console.warn("HMR MessagePack decode error:", e);
    }
  }

  handleHmrEvent(msg) {
    console.log("🔥 HMR event:", msg.type, msg.body);

    switch (msg.type) {
      case "hmr::css_update":
        this.reloadCSS(msg.body);
        break;
      case "hmr::js_update":
        this.reloadJS(msg.body);
        break;
      case "hmr::reload":
        document.dispatchEvent(
          new CustomEvent("wss-reload", { detail: msg.body }),
        );
        break;
      default:
        console.log("HMR: ignoring", msg.type);
    }
  }

  reloadCSS(path) {
    document
      .querySelectorAll(`link[href*="${path}"], link[href*=".css"]`)
      .forEach((link) => {
        const newHref = link.href.split("?")[0] + `?t=${Date.now()}`;
        link.href = newHref;
      });
    console.log(`🔥 CSS reloaded: ${path}`);
  }

  reloadJS(path) {
    document
      .querySelectorAll(`script[src*="${path}"], script[src*=".js"]`)
      .forEach((script) => {
        const newScript = document.createElement("script");
        newScript.src = script.src.split("?")[0] + `?t=${Date.now()}`;
        newScript.onload = () => script.remove();
        document.head.appendChild(newScript);
      });
    console.log(`🔥 JS reloaded: ${path}`);
  }
}

// Initialize immediately (before any other scripts)
new HMRClient();

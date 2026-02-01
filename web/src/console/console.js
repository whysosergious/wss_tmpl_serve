import sh from "../sh.js";

export class WssConsole extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          background-color: #1e1e1e;
          color: #d4d4d4;
          font-family: monospace;
          font-size: 14px;
          overflow: auto;
        }
        .log-entry {
          position: relative;
          padding: 2px 8px;
          border-bottom: 1px solid #252526;
          white-space: pre-wrap;
          display: flex;
          gap: 8px;
        }
        .log-content { flex: 1; word-break: break-word }
        .log-meta { 
            color: #666; 
            font-size: 0.9em; 
            text-align: right;
            user-select: none;
            position: absolute;
            top: 2px;
            right: 2px;
            background-color: #1e1e1ef2;
        }
        .log-meta.anonymous { color: #999; font-style: italic; }
        .log-error { color: #f48771; }
        .log-warn { color: #f2c770; }
        .log-info { color: #75beff; }
        .log-string { color: #ce9178; }
        .log-number { color: #b5cea8; }
        .log-boolean { color: #569cd6; }
        .log-null, .log-undefined { color: #808080; }
        .log-function { font-style: italic; }
      </style>
      <div id="log-container"></div>
    `;
  }

  connectedCallback() {
    this._logContainer = this.shadowRoot.getElementById("log-container");

    // Prevent double-wrapping if component is re-attached
    if (globalThis.wssConsoleWrapped) return;

    this._originalMethods = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    WssConsole.instance = this;

    ["log", "error", "warn", "info"].forEach((method) => {
      console[method] = (...args) => {
        this._originalMethods[method].apply(console, args);
        const stackLine = new Error().stack.split("\n")[2]?.trim() || "";
        if (WssConsole.instance) {
          WssConsole.instance._logToUI(method, stackLine, ...args);
        }
      };
    });

    globalThis.wssConsoleWrapped = true;

    sh.console = this;

    globalThis.addEventListener("message", (e) => {
      if (e.data.source === "iframe-console") {
        this._logToUI(
          `${e.data.type}-iframe`,
          e.data.stack, // Source location from iframe
          "[iframe]",
          ...e.data.args,
        );
      }
    });
  }

  disconnectedCallback() {
    if (this._originalMethods) {
      Object.keys(this._originalMethods).forEach((method) => {
        console[method] = this._originalMethods[method];
      });
      globalThis.wssConsoleWrapped = false;
      WssConsole.instance = null;
    }
  }

  _logToUI(type, stackLine, ...args) {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;

    // Content Wrapper (unchanged - full object rendering restored)
    const content = document.createElement("div");
    content.className = "log-content";

    args.forEach((arg, index) => {
      if (index > 0) content.appendChild(document.createTextNode(" "));

      const span = document.createElement("span");

      if (typeof arg === "string") {
        span.className = "log-string";
        span.textContent = arg;
      } else if (typeof arg === "number") {
        span.className = "log-number";
        span.textContent = String(arg);
      } else if (typeof arg === "boolean") {
        span.className = "log-boolean";
        span.textContent = String(arg);
      } else if (arg === null) {
        span.className = "log-null";
        span.textContent = "null";
      } else if (arg === undefined) {
        span.className = "log-undefined";
        span.textContent = "undefined";
      } else if (arg instanceof Error) {
        span.textContent = arg.stack || arg.message;
        span.style.whiteSpace = "pre-wrap";
      } else if (typeof arg === "function") {
        span.className = "log-function";
        span.textContent = `ƒ ${arg.name}()`;
      } else if (typeof arg === "object") {
        const treeView = document.createElement("wss-tree-view");
        treeView.data = arg;
        span.appendChild(treeView);
      } else {
        span.textContent = String(arg);
      }

      content.appendChild(span);
    });

    entry.appendChild(content);

    // FIXED: Include anonymous but style differently
    const match = stackLine.match(/([^\\/]+):(\d+):(\d+)\)?$/);
    if (match) {
      const meta = document.createElement("div");
      meta.className =
        "log-meta" + (stackLine.includes("<anonymous>") ? " anonymous" : "");

      meta.textContent = match[1].includes("<anonymous>")
        ? `<anonymous>:${match[2]}:${match[3]}`
        : `${match[1]}:${match[2]}:${match[3]}`;
      // meta.textContent = stackLine.includes("<anonymous>")
      //   ? `<anonymous>:${match[2]}:${match[3]}`
      //   : `${match[1]}:${match[2]}:${match[3]}`;
      entry.appendChild(meta);
    }

    this._logContainer.appendChild(entry);
    this.scrollTop = this.scrollHeight;
  }
}

globalThis.customElements.define("wss-console", WssConsole);

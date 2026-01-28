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
          padding: 2px 8px;
          border-bottom: 1px solid #252526;
          white-space: pre-wrap;
          display: flex;
          gap: 8px;
        }
        .log-content { flex: 1; }
        .log-meta { 
            color: #666; 
            font-size: 0.9em; 
            text-align: right;
            user-select: none;
        }
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

    // Bind this instance to the static interceptor
    WssConsole.instance = this;

    ["log", "error", "warn", "info"].forEach((method) => {
      console[method] = (...args) => {
        // 1. Call original method (Browser console logic)
        this._originalMethods[method].apply(console, args);

        // 2. Capture stack trace for Custom UI
        // We create an error to capture the stack, then find the caller
        const stackLine = new Error().stack.split("\n")[2]?.trim() || "";

        // 3. Update Custom UI
        if (WssConsole.instance) {
          WssConsole.instance._logToUI(method, stackLine, ...args);
        }
      };
    });

    globalThis.wssConsoleWrapped = true;
  }

  disconnectedCallback() {
    // Restore original console methods when component is removed
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

    // Content Wrapper
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
      } else if (typeof arg === "object" && arg !== null) {
        // Simplified object view for demo
        span.textContent = JSON.stringify(arg);
      } else {
        span.textContent = String(arg);
      }
      content.appendChild(span);
    });

    entry.appendChild(content);

    // Add Stack Trace Info (Optional: parses "at function (file:line:col)")
    // Extracts just the filename:line for brevity
    const match = stackLine.match(/([^\/]+):(\d+):(\d+)\)?$/);
    if (match) {
        const meta = document.createElement("div");
        meta.className = "log-meta";
        meta.textContent = `${match[1]}:${match[2]}:${match[3]}`;  // "file:line:col"
        entry.appendChild(meta);
    }

    this._logContainer.appendChild(entry);
    this.scrollTop = this.scrollHeight;
  }
}

globalThis.customElements.define("wss-console", WssConsole);

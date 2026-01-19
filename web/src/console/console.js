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
        }
        .log-error {
          color: #f48771;
        }
        .log-warn {
          color: #f2c770;
        }
        .log-info {
          color: #75beff;
        }
      </style>
      <div id="log-container"></div>
    `;
  }

  connectedCallback() {
    this._logContainer = this.shadowRoot.getElementById("log-container");
    this._originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
    };

    this._og = {
      log: console.log,
    };
    console.log = (...args) => this._log("log", ...args);
    console.error = (...args) => this._log("error", ...args);
    console.warn = (...args) => this._log("warn", ...args);
    console.info = (...args) => this._log("info", ...args);
  }

  _log(type, ...args) {
    // Call original console method
    this._originalConsole[type](...args);

    // Add to our custom console
    const entry = document.createElement("div");
    entry.className = `log-entry log-${type}`;
    entry.textContent = args
      .map((arg) => {
        if (typeof arg === "object" && arg !== null) {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      })
      .join(" ");
    this._logContainer.appendChild(entry);

    this.scrollTop = this.scrollHeight;
  }
}

globalThis.customElements.define("wss-console", WssConsole);

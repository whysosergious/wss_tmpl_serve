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
        .log-string { color: #ce9178; }
        .log-number { color: #b5cea8; }
        .log-boolean { color: #569cd6; }
        .log-null, .log-undefined { color: #808080; }
        .log-function { font-style: italic; }
        .log-object, .log-array { white-space: pre-wrap; }
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

    args.forEach((arg, index) => {
      if (index > 0) {
        entry.appendChild(document.createTextNode(' '));
      }
      const span = document.createElement('span');

      if (typeof arg === 'string') {
        span.className = 'log-string';
        span.textContent = arg;
      } else if (typeof arg === 'number') {
        span.className = 'log-number';
        span.textContent = String(arg);
      } else if (typeof arg === 'boolean') {
        span.className = 'log-boolean';
        span.textContent = String(arg);
      } else if (arg === null) {
        span.className = 'log-null';
        span.textContent = 'null';
      } else if (arg === undefined) {
        span.className = 'log-undefined';
        span.textContent = 'undefined';
      } else if (arg instanceof Error) {
        // Errors are already colored by log-error class on entry
        span.textContent = arg.stack || arg.message;
        span.style.whiteSpace = 'pre-wrap';
      } else if (typeof arg === 'function') {
        span.className = 'log-function';
        span.textContent = `ƒ ${arg.name}()`;
      } else if (typeof arg === 'object') {
        span.className = Array.isArray(arg) ? 'log-array' : 'log-object';
        span.textContent = JSON.stringify(arg, null, 2);
      } else {
        span.textContent = String(arg);
      }

      entry.appendChild(span);
    });

    this._logContainer.appendChild(entry);

    this.scrollTop = this.scrollHeight;
  }
}

globalThis.customElements.define("wss-console", WssConsole);

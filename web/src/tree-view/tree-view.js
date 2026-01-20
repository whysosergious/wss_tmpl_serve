export class WssTreeView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          vertical-align: top;
        }
        :host(.open) {
          display: flex;
        }
        .node {
          padding-left: 1em;
          font-family: monospace;
        }
        .entry {
          cursor: pointer;
        }
        .toggler {
          display: inline-block;
          width: 1em;
          text-align: center;
        }
        .children {
          display: none;
        }
        .node.open > .children {
          display: block;
        }
        .node.open > .entry .toggler {
          transform: rotate(90deg);
        }
        .key {
          color: #9cdcfe;
        }
        .value-string { color: #ce9178; }
        .value-number { color: #b5cea8; }
        .value-boolean { color: #569cd6; }
        .value-null, .value-undefined { color: #808080; }
        .preview {
          font-style: italic;
          color: #808080;
        }
      </style>
      <div id="root"></div>
    `;
    this._root = this.shadowRoot.getElementById("root");
  }

  set data(value) {
    this._data = value;
    this._render();
  }

  get data() {
    return this._data;
  }

  _render() {
    this._root.innerHTML = "";
    const rootNode = this._createNode(null, this._data, true); // Pass true for isRoot
    this._root.appendChild(rootNode);
  }

  _createNode(key, value, isRoot = false) { // Add isRoot parameter
    const node = document.createElement("div");
    node.className = "node";

    const entry = document.createElement("div");
    entry.className = "entry";

    const type = typeof value;
    const isObject = type === "object" && value !== null;
    const isArray = Array.isArray(value);
    const isCollapsible = isObject && Object.keys(value).length > 0;

    // Toggler
    const toggler = document.createElement("span");
    toggler.className = "toggler";
    toggler.textContent = isCollapsible ? "▶" : " ";
    entry.appendChild(toggler);

    // Key
    if (key) {
      const keySpan = document.createElement("span");
      keySpan.className = "key";
      keySpan.textContent = `${key}: `;
      entry.appendChild(keySpan);
    }

    // Value/Preview
    if (isCollapsible) {
      const preview = document.createElement("span");
      preview.className = "preview";
      preview.textContent = isArray ? `Array(${value.length})` : "{...}";
      entry.appendChild(preview);

      // Children
      const children = document.createElement("div");
      children.className = "children";
      node.appendChild(children);

      entry.addEventListener("click", () => {
        node.classList.toggle("open");
        if (isRoot) this.classList.toggle("open"); // Only toggle host class if it's the root node
        // Lazily render children on first expansion
        if (node.classList.contains("open") && children.innerHTML === "") {
          for (const [childKey, childValue] of Object.entries(value)) {
            children.appendChild(this._createNode(childKey, childValue));
          }
        }
      });
    } else {
      const valueSpan = this._createValueSpan(value);
      entry.appendChild(valueSpan);
    }

    node.prepend(entry);
    return node;
  }

  _createValueSpan(value) {
    const span = document.createElement("span");
    const type = typeof value;
    if (type === "string") {
      span.className = "value-string";
      span.textContent = `"${value}"`;
    } else if (type === "number") {
      span.className = "value-number";
      span.textContent = String(value);
    } else if (type === "boolean") {
      span.className = "value-boolean";
      span.textContent = String(value);
    } else if (value === null) {
      span.className = "value-null";
      span.textContent = "null";
    } else if (value === undefined) {
      span.className = "value-undefined";
      span.textContent = "undefined";
    } else {
      span.textContent = String(value);
    }
    return span;
  }
}

globalThis.customElements.define("wss-tree-view", WssTreeView);
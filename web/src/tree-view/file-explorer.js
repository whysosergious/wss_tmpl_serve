import { sh } from "/src/sh.js";

export class WssFileExplorer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: monospace;
        }
        .entry {
          cursor: pointer;
        }
        .dir {
          font-weight: bold;
        }
        .children {
          padding-left: 1em;
          display: none;
        }
        .entry.open > .children {
          display: block;
        }
      </style>
      <div id="root"></div>
    `;
    this._root = this.shadowRoot.getElementById("root");
  }

  async connectedCallback() {
    await sh.ws.ready.promise;
    const rootPath = this.getAttribute("root") || "/";
    const files = await this.listFiles(rootPath);
    const rootNode = this._createNode({ name: rootPath, type: "dir" }, true);
    this._root.appendChild(rootNode);
    this.renderFiles(files, rootNode.querySelector(".children"));
    rootNode.classList.add("open");
  }

  async listFiles(path) {
    const cmd = `ls -a ".${path}" | to json`;
    const result = await sh.ws.send({ type: "cmd", body: cmd });
    try {
      return JSON.parse(result.body);
    } catch (e) {
      console.error("Failed to parse file list:", e, result.body);
      return [];
    }
  }

  renderFiles(files, parent) {
    parent.innerHTML = "";
    files.forEach((file) => {
      const node = this._createNode(file);
      parent.appendChild(node);
    });
  }

  _createNode(file, isRoot = false) {
    const isDir = isRoot || file.name.endsWith("/");
    const name = isRoot ? file.name : file.name.replace(/\/$/, "");

    const node = document.createElement("div");
    node.className = "entry " + (isDir ? "dir" : "file");
    node.textContent = name;

    if (isRoot) {
      node.dataset.isRoot = true;
    }

    if (isDir) {
      const children = document.createElement("div");
      children.className = "children";
      node.appendChild(children);

      node.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (node.classList.contains("open")) {
          node.classList.remove("open");
        } else {
          node.classList.add("open");
          if (!children.hasChildNodes()) {
            const path = this.getNodePath(node);
            const files = await this.listFiles(path);
            this.renderFiles(files, children);
          }
        }
      });
    }
    return node;
  }

  getNodePath(node) {
    const path = [];
    let current = node;
    // special case for the root node
    if (current.dataset.isRoot) {
      return current.textContent;
    }

    while (current && !current.dataset.isRoot) {
      path.unshift(current.firstChild.textContent);
      // ascend to the parent entry, skipping the 'children' container
      const parent = current.parentElement.parentElement;
      if (parent.classList.contains("entry")) {
        current = parent;
      } else {
        // we have reached the root of the shadow dom
        current = null;
      }
    }

    // now current should be the root node
    if (current && current.dataset.isRoot) {
      path.unshift(current.textContent);
    } else {
      // fallback to the attribute if we couldn't find the root node
      path.unshift(this.getAttribute("root") || "/");
    }

    return path.join("/").replace(/\/+/g, "/");
  }
}

globalThis.customElements.define("wss-file-explorer", WssFileExplorer);

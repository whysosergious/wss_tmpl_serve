import { sh } from "/src/sh.js";

const FOLDER_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
    <path d="M19.5 21a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-5.25a3 3 0 0 1-2.65-1.5L9.9 2.25A3 3 0 0 0 7.25 1.5h-3.75a3 3 0 0 0-3 3v15a3 3 0 0 0 3 3h15.75z" />
  </svg>
`;

const FOLDER_OPEN_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
    <path fill-rule="evenodd" d="M1.5 6a3 3 0 0 1 3-3h3.25a3 3 0 0 1 2.65 1.5l.9 1.5H19.5a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V6zm3-1.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-8.25a1.5 1.5 0 0 1-1.32-.75l-.9-1.5Z" clip-rule="evenodd" />
  </svg>
`;

const FILE_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
    <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a.375.375 0 0 1-.375-.375V6.75A3.75 3.75 0 0 0 9 3H5.625zM12.75 12.75a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5h-2.25zM12 15a.75.75 0 0 1 .75.75h2.25a.75.75 0 0 1 0 1.5h-2.25a.75.75 0 0 1-.75-.75zM12.75 18.75a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 0 0-1.5h-2.25z" />
    <path d="M14.25 9.75a.75.75 0 0 0-1.5 0v1.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 0-1.5h-.75v-1.5z" />
    <path d="M15 4.125A2.625 2.625 0 0 0 12.375 1.5h-1.5a.75.75 0 0 0 0 1.5h1.5c.414 0 .75.336.75.75v3a.75.75 0 0 0 .75.75h3a.75.75 0 0 0 .75-.75V6.75A2.625 2.625 0 0 0 15 4.125z" />
  </svg>
`;

export class WssFileExplorer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          font-size: 14px;
          color: #d4d4d4;
          background-color: #1e1e1e;
          --icon-color: #c5c5c5;
          --folder-icon-color: #7aa2f7;
          --hover-bg-color: rgba(255, 255, 255, 0.1);
        }
        .entry {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 4px 0px;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.1s ease-in-out;
        }
        .entry:hover {
          background-color: var(--hover-bg-color);
        }
        .entry.file:hover {
          cursor: default;
        }
        .entry-icon {
          width: 1em;
          height: 1em;
          margin-right: 8px;
          color: var(--icon-color);
          flex-shrink: 0;
        }
        .entry.dir > .entry-icon {
          color: var(--folder-icon-color);
        }
        .entry-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .children {
          padding-left: 16px;
          display: none;
        }
        .entry.open > .children {
          display: block;
        }
        .entry.open > .entry-header > .entry-icon .closed {
          display: none;
        }
        .entry.open > .entry-header > .entry-icon .open {
          display: block;
        }
         .entry-icon .open {
          display: none;
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
    const rootNode = this._createNode(
      { name: rootPath, type: "dir" },
      true,
      "",
    );
    rootNode.dataset.path = rootPath;
    this._root.appendChild(rootNode);
    this.renderFiles(files, rootNode.querySelector(".children"), rootPath);
    rootNode.classList.add("open");
  }

  async listFiles(path) {
    const cmd = `cd ".${path}" ; ls -a | to json`;
    const result = await sh.ws.send({ type: "cmd", body: cmd });
    try {
      return JSON.parse(result.body);
    } catch (e) {
      console.error("Failed to parse file list:", e, result.body);
      return [];
    }
  }

  renderFiles(files, parent, parentPath) {
    parent.innerHTML = "";
    files
      .sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === "dir" ? -1 : 1;
      })
      .forEach((file) => {
        const node = this._createNode(file, false, parentPath);
        parent.appendChild(node);
      });
  }

  _createNode(file, isRoot = false, parentPath = "") {
    const isDir = isRoot || file.type === "dir";
    const name = isRoot ? file.name : file.name;
    const path = isRoot
      ? file.name
      : [parentPath, file.name].join("/").replace(/\/+/g, "/");

    const node = document.createElement("div");
    node.className = "entry " + (isDir ? "dir" : "file");
    node.dataset.path = path;

    if (isRoot) {
      node.dataset.isRoot = true;
    }

    const entryHeader = document.createElement("div");
    entryHeader.className = "entry-header";
    entryHeader.style.display = "flex";
    entryHeader.style.alignItems = "center";

    const icon = document.createElement("span");
    icon.className = "entry-icon";

    if (isDir) {
      icon.innerHTML = `<span class="closed">${FOLDER_ICON}</span><span class="open">${FOLDER_OPEN_ICON}</span>`;
    } else {
      icon.innerHTML = FILE_ICON;
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "entry-name";
    nameSpan.textContent = name;

    entryHeader.appendChild(icon);
    entryHeader.appendChild(nameSpan);

    node.appendChild(entryHeader);

    if (isDir) {
      const children = document.createElement("div");
      children.className = "children";
      node.appendChild(children);

      entryHeader.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (node.classList.contains("open")) {
          node.classList.remove("open");
        } else {
          node.classList.add("open");
          if (!children.hasChildNodes()) {
            const path = node.dataset.path;
            const files = await this.listFiles(path);
            this.renderFiles(files, children, path);
          }
        }
      });
    }
    return node;
  }
}

globalThis.customElements.define("wss-file-explorer", WssFileExplorer);

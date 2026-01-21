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
          align-items: center;
          padding: 4px 8px;
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
        .entry.open > .entry-icon .closed {
          display: none;
        }
        .entry.open > .entry-icon .open {
          display: block;
        }
         .entry-icon .open {
          display: none;
        }
      </style>
      <div id="root"></div>
    `;
    this._root = this.shadowRoot.getElementById("root");
    this._files = [];
  }

  async connectedCallback() {
    await sh.ws.ready.promise;
    const rootPath = this.getAttribute("root") || "/";
    const files = await this.listFiles(rootPath);
    this._files = files
      .map((file) => ({ ...file, depth: 0, parentPath: rootPath, open: false }))
      .sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === "dir" ? -1 : 1;
      });
    this.render();
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

  render() {
    this._root.innerHTML = "";
    this._files.forEach((file) => {
      const node = this._createNode(file);
      this._root.appendChild(node);
    });
  }

  _createNode(file) {
    const isDir = file.type === "dir";
    const name = file.name;
    const path = [file.parentPath, file.name].join("/").replace(/\/+/g, "/");

    const node = document.createElement("div");
    node.className = "entry " + (isDir ? "dir" : "file");
    node.dataset.path = path;
    node.style.paddingLeft = `${file.depth * 16 + 8}px`;
    if (file.open) {
      node.classList.add("open");
    }

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

    node.appendChild(icon);
    node.appendChild(nameSpan);

    if (isDir) {
      node.addEventListener("click", async (e) => {
        e.stopPropagation();
        file.open = !file.open;
        if (file.open) {
          const index = this._files.findIndex(
            (f) => f.name === file.name && f.parentPath === file.parentPath,
          );
          const files = await this.listFiles(path);
          const newFiles = files
            .map((f) => ({
              ...f,
              depth: file.depth + 1,
              parentPath: path,
              open: false,
            }))
            .sort((a, b) => {
              if (a.type === b.type) {
                return a.name.localeCompare(b.name);
              }
              return a.type === "dir" ? -1 : 1;
            });
          this._files.splice(index + 1, 0, ...newFiles);
        } else {
          const index = this._files.findIndex(
            (f) => f.name === file.name && f.parentPath === file.parentPath,
          );
          const children = this._getChildren(file, index);
          this._files.splice(index + 1, children.length);
        }

        this.render();
      });
    } else {
      // It's a file, add a click listener to open it
      node.addEventListener("click", async (e) => {
        e.stopPropagation();
        const content = await this.readFileContent(path);
        this.dispatchEvent(new CustomEvent("file-opened", {
          detail: { path, name: file.name, content },
          bubbles: true,
          composed: true,
        }));
      });
    }
    return node;
  }

  async readFileContent(path) {
    const cmd = `cat ".${path}"`; // Use 'cat' to read file content
    try {
      const result = await sh.ws.send({ type: "cmd", body: cmd });
      return result.body; // Assuming result.body contains the file content
    } catch (e) {
      console.error(`Failed to read file content for ${path}:`, e);
      return `Error reading file: ${path}`;
    }
  }

  _getChildren(parent, parentIndex) {
    const children = [];
    for (let i = parentIndex + 1; i < this._files.length; i++) {
      const file = this._files[i];
      if (file.depth > parent.depth) {
        children.push(file);
      } else {
        break;
      }
    }
    return children;
  }
}

globalThis.customElements.define("wss-file-explorer", WssFileExplorer);

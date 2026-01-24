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
  /** @type {Array<{name: string, type: string, depth: number, parentPath: string, open: boolean}>} */
  _files = [];
  /** @type {HTMLElement} */
  _root;

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
        .entry.drag-over {
          background-color: rgba(255, 255, 255, 0.2);
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
  }

  async connectedCallback() {
    await sh.ws.ready.promise;

    // Capture currently open directory paths before re-initializing
    const previouslyOpenPaths = this._getOpenDirectoryPaths();

    const rootPath = this.getAttribute("root") || "/";
    const files = await this.listFiles(rootPath);
    this._files = files
      .map((file) => ({ ...file, depth: 0, parentPath: rootPath, open: false }))
      .sort((a, b) =>
        a.type === b.type
          ? a.name.localeCompare(b.name)
          : a.type === "dir"
            ? -1
            : 1,
      );

    // Restore previously open directory paths
    this._setOpenDirectoryPaths(previouslyOpenPaths);

    this.render(); // Initial render or render after state restoration

    /** @type {WssContextMenuAPI} */
    this.contextMenu = document.querySelector("wss-context-menu");
    this.attachContextMenu();
  }

  /** @private */
  attachContextMenu() {
    /** @type {WssContextMenuAPI} */
    this.contextMenu = document.querySelector("wss-context-menu");

    // CRITICAL: Capture phase on HOST (pierces shadow DOM)
    this.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        /** @type {HTMLElement} */
        const target = e.composedPath()[0];
        const entry = target.closest(".entry");

        /** @type {ContextData} */
        let context;
        if (!entry?.dataset.path) {
          context = {
            type: "empty",
            path: this.currentPath || "/",
            name: "",
            isDir: false,
            items: [
              {
                label: "New",
                action: () => {
                  this.handleNew(context.path);
                },
                icon: null,
              },
            ],
          };
        } else {
          const file = this._files.find(
            (f) => [f.parentPath, f.name].join("/") === entry.dataset.path,
          );
          context = {
            type: file?.type || "file",
            path: entry.dataset.path,
            name: file?.name || "",
            isDir: file?.type === "dir",
            items: [
              {
                label: "New",
                action: () => {
                  this.handleNew(entry);
                },
                icon: null,
              },
              {
                label: "Rename",
                action: () => {
                  this.handleRename(entry);
                },
                icon: null,
              },
              { separator: true },
              {
                label: "Delete",
                action: () => {
                  this.handleDelete(entry);
                },
                icon: null,
              },
            ],
          };
        }

        this.contextMenu?.show(/** @type {MouseEvent} */ (e), context);
      },
      { capture: true },
    );
  }

  /**
   * @param {HTMLElement} entry
   */
  handleRename(entry) {
    entry.contentEditable = true;
    entry.focus();

    const abc = new AbortController();
    const original_text = entry.innerText;
    const original_path = (
      entry._data.parentPath +
      "/" +
      original_text
    ).replace(/\/+/, "/");

    document.execCommand("selectAll", false, null);
    entry.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopImmediatePropagation();

          entry.blur();
        }
      },
      { signal: abc.signal },
    );

    entry.addEventListener(
      "blur",
      async (e) => {
        const new_name = entry.innerText;
        const path = (entry._data.parentPath + "/" + new_name).replace(
          /\/+/,
          "/",
        );
        const exists = await sh.ws.send({
          type: "cmd",
          body: `'.${path}' | path exists`,
        });

        if (exists.body.trim() === "true") {
          await sh.components.prompt.show({
            title: "----",
            msg: "File already exists",
            confirm: "Ok",
          });
          entry.focus();
        } else {
          sh.ws.send({
            type: "cmd",
            body: `mv -f '.${original_path}' '.${path}'`,
          });
          entry.dataset.path = path;
          entry._data.name = new_name;
          entry.contentEditable = false;
          abc.abort();
          this.refresh_path(entry._data.parentPath);
        }
      },
      { signal: abc.signal },
    );
  }

  /**
   * @param {HTMLElement} entry
   */
  async handleNew(entry) {
    const path = (entry._data.parentPath + "/" + entry._data.name).replace(
      /\/+/,
      "/",
    );
    // IMMEDIATELY create temp entry
    const tempName = "new";
    const tempPath = (path + "/" + tempName).replace(/\/+/, "/");

    const entry_placeholder = {
      name: tempName,
      type: "file",
      depth: entry._data.depth, // Will be fixed on render
      parentPath: path,
      open: false,
    };

    // get the index of target to append the new node under it
    const entry_index = this._files.indexOf(entry._data);

    // open closed directories
    if (entry._data.type === "dir") {
      entry_placeholder.depth++;

      if (!entry._data.open) {
        const files = await this.listFiles(path);
        const newFiles = files
          .map((f) => ({
            ...f,
            depth: entry._data.depth + 1,
            parentPath: path,
            open: false,
          }))
          .sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name);
            }
            return a.type === "dir" ? -1 : 1;
          });
        this._files.splice(entry_index + 1, 0, ...newFiles);

        entry._data.open = true;
      }
    }

    this._files.splice(entry_index + 1, 0, entry_placeholder);
    this.render();

    // Find & edit
    const newEntry = this._root.querySelector(`[data-path="${tempPath}"]`);
    if (!newEntry) return;

    const abc = new AbortController();
    const original_text = newEntry.innerText;

    newEntry.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          newEntry.blur();
        }
      },
      { signal: abc.signal },
    );

    newEntry.contentEditable = true;
    newEntry.focus();
    document.execCommand("selectAll", false, null);
    newEntry.addEventListener(
      "blur",
      async (e) => {
        const new_name = newEntry.innerText.trim();
        if (!new_name || new_name === original_text) {
          // Remove temp if empty/cancel
          const tempIndex = this._files.findIndex(
            (f) =>
              f.name === tempName && f.parentPath === newEntry._data.parentPath,
          );
          if (tempIndex > -1) this._files.splice(tempIndex, 1);
          newEntry.remove();
          abc.abort();
          return;
        }

        const parent_path =
          entry._data.type === "dir"
            ? entry._data.parentPath + "/" + entry._data.name
            : entry._data.parentPath;
        const fullPath = [parent_path, new_name].join("/").replace(/\/+/, "/");

        // Backend create
        const cmd = `(mkdir ('.${fullPath}' | path dirname)) ; '' | save '.${fullPath}'`;
        await sh.ws.send({ type: "cmd", body: cmd });

        // Update entry
        newEntry.dataset.path = fullPath;
        newEntry._data.name = new_name;
        newEntry.contentEditable = false;
        abc.abort();

        // Refresh parent to pick up new file + fix depth/sort
        this.refresh_path(newEntry._data.parentPath);
      },
      { signal: abc.signal },
    );
  }

  /**
   * @param {HTMLElement} entry
   */
  async handleDelete(entry) {
    try {
      await sh.components.prompt.show({
        title: "Delete?",
        msg: `Delete ${entry.dataset.path}?`,
        confirm: "Yes",
        cancel: "No",
      });

      const path = entry.dataset.path;
      await sh.ws.send({ type: "cmd", body: `rm -rf '.${path}'` });

      // Remove from _files
      const index = this._files.findIndex(
        (f) => [f.parentPath, f.name].join("/") === path,
      );
      if (index > -1) this._files.splice(index, 1);

      // this.refresh_path(newEntry._data.parentPath);

      this.render();
    } catch (e) {}
  }

  /**
   * @param {string} action
   * @param {ContextData} context
   */
  async handleContextAction(action, context) {
    try {
      switch (action) {
        case "new-file":
          await this.createNewFile(context.path);
          break;
        case "new-folder":
          await this.createNewFolder(context.path);
          break;
        case "rename":
          await this.renameItem(context.path, context.name);
          break;
        case "delete":
          await this.deleteItem(context.path);
          break;
      }
      this.refresh_path(context.path);
    } catch (err) {
      console.error(`Context action failed: ${action}`, err);
    }
  }

  async createNewFile(parentPath) {
    const parentDir = parentPath.endsWith("/")
      ? parentPath.slice(0, -1)
      : parentPath;
    await sh.exec(`touch "${parentDir}/newfile.txt"`);
  }

  async createNewFolder(parentPath) {
    const parentDir = parentPath.endsWith("/")
      ? parentPath.slice(0, -1)
      : parentPath;
    await sh.exec(`mkdir "${parentDir}/newfolder"`);
  }

  async renameItem(path, oldName) {
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
    const newName = prompt("New name:", oldName);
    if (newName && newName !== oldName) {
      await sh.exec(`mv "${path}" "${dir}/${newName}"`);
    }
  }

  async deleteItem(path) {
    if (confirm(`Delete ${path}?`)) {
      await sh.exec(`rm -rf "${path}"`);
    }
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

  /**
   * Returns an array of paths for all currently open directories.
   * @returns {string[]}
   * @private
   */
  _getOpenDirectoryPaths() {
    return this._files
      .filter((file) => file.type === "dir" && file.open)
      .map((file) =>
        [file.parentPath, file.name].join("/").replace(/\/+/g, "/"),
      );
  }

  /**
   * Sets the 'open' state for directories based on a list of paths.
   * Also ensures parent directories are opened if a child is in the list.
   * @param {string[]} openPaths
   * @private
   */
  _setOpenDirectoryPaths(openPaths) {
    const openSet = new Set(openPaths);

    // Mark directories as open based on openPaths
    this._files.forEach((file) => {
      if (file.type === "dir") {
        const fullPath = [file.parentPath, file.name]
          .join("/")
          .replace(/\/+/g, "/");
        if (openSet.has(fullPath)) {
          file.open = true;
        } else {
          file.open = false; // Ensure it's closed if not in the set
        }
      }
    });

    // Ensure all parent directories of open directories are also open
    let changed = true;
    while (changed) {
      changed = false;
      this._files.forEach((file) => {
        if (file.type === "dir" && file.open) {
          const parentPath = file.parentPath;
          if (parentPath !== "/") {
            // Don't try to open the root's parent
            const parentDir = this._files.find(
              (p) =>
                [p.parentPath, p.name].join("/").replace(/\/+/g, "/") ===
                  parentPath && p.type === "dir",
            );
            if (parentDir && !parentDir.open) {
              parentDir.open = true;
              changed = true;
            }
          }
        }
      });
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
    node._data = file;
    node.className = "entry " + (isDir ? "dir" : "file");
    node.dataset.path = path;
    node.dataset.type = isDir ? "dir" : "file";
    node.draggable = true; // Make nodes draggable
    node.style.paddingLeft = `${file.depth * 16 + 8}px`;
    if (file.open) {
      node.classList.add("open");
    }

    node.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      e.dataTransfer.setData("text/plain", path.trim()); // Trim the path
      e.dataTransfer.effectAllowed = "move";
    });

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

    // Apply dragover, dragleave, and drop listeners to all nodes (files and directories)
    node.addEventListener("dragover", (e) => {
      e.preventDefault(); // Allow drop
      e.stopPropagation();
      if (e.dataTransfer.effectAllowed === "move") {
        node.classList.add("drag-over");
      }
    });

    node.addEventListener("dragleave", (e) => {
      e.stopPropagation();
      node.classList.remove("drag-over");
    });

    node.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      node.classList.remove("drag-over");

      const sourcePath = e.dataTransfer.getData("text/plain").trim();
      let finalDestinationPath;

      if (node._data.type === "file") {
        // If dropping onto a file, the destination is the file's parent directory
        finalDestinationPath = node._data.parentPath.trim();
      } else {
        // If dropping onto a directory, the destination is the directory itself
        finalDestinationPath = path.trim();
      }

      if (
        sourcePath === finalDestinationPath ||
        sourcePath.startsWith(finalDestinationPath + "/")
      ) {
        // Do not move a folder into itself or its subfolder
        return;
      }

      const sourceParts = sourcePath.split("/");
      const fileName = sourceParts[sourceParts.length - 1];
      const newPath = finalDestinationPath + "/" + fileName;

      // Perform the move using the existing rename logic (mv command)
      await sh.ws.send({
        type: "cmd",
        body: `mv -f '.${sourcePath}' '.${newPath}'`,
      });

      // Refresh the explorer
      this.connectedCallback();
    });

    if (isDir) {
      node.addEventListener("click", async (e) => {
        e.stopPropagation();
        file.open = !file.open;
        if (file.open) {
          const index = this._files.findIndex(
            (f) => f.name === file.name && f.parentPath === file.parentPath,
          );
          const files = await this.listFiles(node.dataset.path);
          const newFiles = files
            .map((f) => ({
              ...f,
              depth: file.depth + 1,
              parentPath: node.dataset.path,
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
        const content = await this.readFileContent(node.dataset.path);
        this.dispatchEvent(
          new CustomEvent("file-opened", {
            detail: { path, name: file.name, content },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }

    return node;
  }

  async readFileContent(path) {
    const cmd = `open ".${path}" -r`; // Use 'open' to read file content
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

  async refresh_path(path) {
    // a bit hacky, but it works
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    const parent_dir = this._files.find((f) => {
      const f_path = [f.parentPath, f.name].join("/").replace(/\/+/g, "/");
      return f_path === path && f.type === "dir" && f.open;
    });

    if (parent_dir) {
      const index = this._files.indexOf(parent_dir);
      const children = this._getChildren(parent_dir, index);
      this._files.splice(index + 1, children.length);

      const files = await this.listFiles(path);
      const newFiles = files
        .map((f) => ({
          ...f,
          depth: parent_dir.depth + 1,
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
      this.render();
    }
  }
}

globalThis.customElements.define("wss-file-explorer", WssFileExplorer);

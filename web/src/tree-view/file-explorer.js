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
    const nameSpan = entry.querySelector(".entry-name");
    nameSpan.contentEditable = true;
    nameSpan.focus();

    const abc = new AbortController();
    const original_text = nameSpan.innerText;
    const original_path = entry.dataset.path;

    document.execCommand("selectAll", false, null);
    nameSpan.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopImmediatePropagation();
          nameSpan.blur();
        } else if (e.key === "Escape") {
          nameSpan.innerText = original_text;
          nameSpan.blur();
        }
      },
      { signal: abc.signal },
    );

    nameSpan.addEventListener(
      "blur",
      async () => {
        const new_name = nameSpan.innerText.trim();
        nameSpan.contentEditable = false;
        abc.abort();

        if (!new_name || new_name === original_text) {
          nameSpan.innerText = original_text; // Restore if empty or unchanged
          return;
        }

        const parentPath = entry._data.parentPath;
        const new_path = (parentPath + "/" + new_name).replace(/\/+/, "/");

        const existsResult = await sh.ws.send({
          type: "cmd",
          body: `'.${new_path}' | path exists`,
        });

        if (existsResult.body.trim() === "true") {
          await sh.components.prompt.show({
            title: "Error",
            msg: "File or folder already exists.",
            confirm: "Ok",
          });
          nameSpan.innerText = original_text; // Restore original name
        } else {
          await sh.ws.send({
            type: "cmd",
            body: `mv -f '.${original_path}' '.${new_path}'`,
          });
          this.refresh_path(parentPath);
        }
      },
      { signal: abc.signal },
    );
  }

  /**
   * @param {HTMLElement | string} entryOrPath
   */
  async handleNew(entryOrPath) {
    let parentPath, parentData, parentIndex, newEntryDepth;

    if (typeof entryOrPath === "string") {
      parentPath = entryOrPath;
      parentData = this._files.find((f) => {
        const f_path = [f.parentPath, f.name].join("/").replace(/\/+/g, "/");
        return f_path === parentPath && f.type === "dir";
      });

      if (parentData) {
        parentIndex = this._files.indexOf(parentData);
        newEntryDepth = parentData.depth + 1;
      } else {
        // Root or empty area
        parentIndex = -1;
        newEntryDepth = 0;
      }
    } else {
      const clickedData = entryOrPath._data;
      parentIndex = this._files.indexOf(clickedData);
      if (clickedData.type === "dir") {
        parentPath = (clickedData.parentPath + "/" + clickedData.name).replace(
          /\/+/,
          "/",
        );
        parentData = clickedData;
        newEntryDepth = clickedData.depth + 1;
      } else {
        parentPath = clickedData.parentPath;
        // No parentData if we clicked a file in the root
        parentData = this._files.find((f) => {
          const f_path = [f.parentPath, f.name]
            .join("/")
            .replace(/\/+/g, "/");
          return f_path === parentPath && f.type === "dir";
        });
        newEntryDepth = clickedData.depth;
      }
    }
    parentPath = parentPath.replace(/\/+/, "/");

    // Open directory if it's closed
    if (parentData && !parentData.open) {
      parentData.open = true;
      // We must render first, then continue, which complicates things.
      // A better approach is to make refresh_path handle it.
      // For now, let's just optimistically open and proceed.
    }

    const tempName = "new";
    const tempPath = (parentPath === "/" ? "/" : parentPath + "/") + tempName;

    const placeholder = {
      name: tempName,
      type: "file", // Assume file, user can create dir by adding "/"
      depth: newEntryDepth,
      parentPath: parentPath,
      open: false,
    };

    // Insert placeholder and re-render
    this._files.splice(parentIndex + 1, 0, placeholder);
    this.render();

    const newEntryEl = this._root.querySelector(`[data-path="${tempPath}"]`);
    if (!newEntryEl) return;

    const nameSpan = newEntryEl.querySelector(".entry-name");
    const abc = new AbortController();

    const cleanup = () => {
      const tempIndex = this._files.indexOf(placeholder);
      if (tempIndex > -1) this._files.splice(tempIndex, 1);
      this.render();
      abc.abort();
    };

    nameSpan.contentEditable = true;
    nameSpan.focus();
    document.execCommand("selectAll", false, null);

    nameSpan.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          nameSpan.blur();
        } else if (e.key === "Escape") {
          nameSpan.blur();
          cleanup();
        }
      },
      { signal: abc.signal },
    );

    nameSpan.addEventListener(
      "blur",
      async () => {
        const new_name = nameSpan.innerText.trim();
        nameSpan.contentEditable = false;

        if (!new_name || new_name === tempName) {
          cleanup();
          return;
        }

        const fullPath =
          (parentPath === "/" ? "/" : parentPath + "/") + new_name;
        let cmd;
        const isDir = /\/$/.test(new_name);
        const finalPath = isDir ? fullPath.slice(0, -1) : fullPath;

        const existsResult = await sh.ws.send({
          type: "cmd",
          body: `'.${finalPath}' | path exists`,
        });

        if (existsResult.body.trim() === "true") {
          await sh.components.prompt.show({
            title: "Error",
            msg: "File or folder already exists.",
            confirm: "Ok",
          });
          cleanup();
          return;
        }

        if (isDir) {
          cmd = `mkdir '.${finalPath}'`;
        } else {
          cmd = `mkdir ('.${finalPath}' | path dirname) ; '' | save '.${finalPath}'`;
        }
        await sh.ws.send({ type: "cmd", body: cmd });

        abc.abort();
        this.refresh_path(parentPath);
      },
      { once: true },
    ); // Use `once` to ensure it only fires once
  }

  /**
   * @param {HTMLElement} entry
   */
  async handleDelete(entry) {
    try {
      const path = entry.dataset.path;
      await sh.components.prompt.show({
        title: "Delete?",
        msg: `Are you sure you want to delete ${path}? This action cannot be undone.`,
        confirm: "Yes, Delete",
        cancel: "No",
      });

      await sh.ws.send({ type: "cmd", body: `rm -rf '.${path}'` });

      this.refresh_path(entry._data.parentPath);
    } catch (e) {
      // User cancelled the prompt
    }
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

      if (sourcePath === finalDestinationPath) {
        // Do not move a folder into itself or its subfolder
        return;
      }

      const sourceParts = sourcePath.split("/");
      const fileName = sourceParts[sourceParts.length - 1];
      const newPath = finalDestinationPath + "/" + fileName;

      // Perform the move using the existing rename logic (mv command)
      const mvResult = await sh.ws.send({
        type: "cmd",
        body: `mv -f '.${sourcePath}' '.${newPath}'`,
      });

      if (mvResult.body.trim() !== "") {
        console.error("Move command failed:", mvResult.body);
        return; // Stop execution if move failed
      }

      // Refresh the explorer for both source and destination paths
      const sourceParentPath = sourcePath.substring(
        0,
        sourcePath.lastIndexOf("/"),
      );
      await this.refresh_path(sourceParentPath);
      await this.refresh_path(finalDestinationPath);
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
      return f_path === path && f.type === "dir";
    });

    if (parent_dir) {
      if (!parent_dir.open) {
        parent_dir.open = true;
      }

      const index = this._files.indexOf(parent_dir);
      const children = this._getChildren(parent_dir, index);
      this._files.splice(index + 1, children.length);

      const files = await this.listFiles(path);
      // Map existing open state to new files
      const existingOpenStates = new Map(
        this._files
          .filter((f) => f.type === "dir")
          .map((f) => {
            const fullPath = [f.parentPath, f.name]
              .join("/")
              .replace(/\/+/g, "/");
            return [fullPath, f.open];
          }),
      );
      const newFiles = files
        .map((f) => {
          const fullPath = [path, f.name].join("/").replace(/\/+/g, "/");
          return {
            ...f,
            depth: parent_dir.depth + 1,
            parentPath: path,
            open: existingOpenStates.get(fullPath) || false, // Use existing state or default to false
          };
        })
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

// web/src/workspace/workspace.js
import "./mod.js"; // This will import other workspace-related modules

export class WssWorkspace extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.editorInstances = new Map(); // Map to hold wss-editor instances by tab ID
    this.activeTabId = null;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        #tabs-slot {
          flex-shrink: 0;
        }
        #editors-container {
          flex-grow: 1;
          position: relative; /* For absolutely positioned editors */
          overflow: hidden; /* Ensure editors don't overflow this container */
        }
        #editors-container > wss-editor {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: none; /* Hidden by default */
        }
        #editors-container > wss-editor.active {
          display: block;
        }
        .cm-editor {
          height: 100%; /* Ensure CodeMirror editor takes full height */
        }
      </style>
      <div id="tabs-slot"></div>
      <div id="editors-container"></div>
    `;

    this.tabsSlot = this.shadowRoot.getElementById("tabs-slot");
    this.editorsContainer = this.shadowRoot.getElementById("editors-container");

    this._setupTabs();
    this._addEventListeners();

    // Since `wss-tabs` initially adds an "untitled" tab, activate its editor
    // This assumes the first tab added will have an ID.
    // A more robust solution might wait for a `tab-added` event from wss-tabs
    // or add the first tab explicitly in workspace.
    // For now, let's rely on wss-tabs's default behavior and
    // its event dispatching to populate editors.
  }

  _setupTabs() {
    this.wssTabs = document.createElement("wss-tabs");
    this.tabsSlot.appendChild(this.wssTabs);
  }

  _addEventListeners() {
    this.wssTabs.addEventListener("tab-added", this._handleTabAdded.bind(this));
    this.wssTabs.addEventListener(
      "tab-activated",
      this._handleTabActivated.bind(this),
    );
    this.wssTabs.addEventListener(
      "tab-closed",
      this._handleTabClosed.bind(this),
    );
    this.addEventListener("rename-tab", this._handleRenameTab.bind(this));

    // Listen for file-opened events from wss-file-explorer in the light DOM
    const wssFileExplorer = document.querySelector("wss-file-explorer");
    if (wssFileExplorer) {
      wssFileExplorer.addEventListener(
        "file-opened",
        this._handleFileOpened.bind(this),
      );
    } else {
      console.warn(
        "wss-file-explorer not found in the light DOM. File opening will not work.",
      );
    }
  }

  _handleTabAdded(event) {
    const { id, name, path, initialContent } = event.detail;
    // When a tab is added, create a corresponding editor instance
    this._createEditorForTab(id, name, path, initialContent || ""); // Pass initialContent
  }

  _createEditorForTab(id, name, path, content) {
    if (this.editorInstances.has(id)) {
      console.warn(`Tab with ID ${id} already exists, activating it.`);
      this.wssTabs.setActiveTab(id);
      // Ensure editor content is updated in case file changed externally
      const editor = this.editorInstances.get(id);
      if (editor) {
        editor.loadContent(content);
      }
      return; // Do not create a new editor if one already exists
    }

    const editor = document.createElement("wss-editor");
    editor.setAttribute("tab-id", id);
    editor.setAttribute("tab-path", path);
    this.editorsContainer.appendChild(editor);
    this.editorInstances.set(id, editor);

    editor.loadContent(content); // Load initial content

    this.activateEditor(id);
  }

  _handleTabActivated(event) {
    const { id } = event.detail;
    this.activateEditor(id);
  }

  _handleTabClosed(event) {
    const { id } = event.detail;
    const editor = this.editorInstances.get(id);
    if (editor) {
      // Save editor state before removing it, if needed for session restoration
      // this.editorStates.set(id, editor.getState());
      this.editorsContainer.removeChild(editor);
      this.editorInstances.delete(id);
    }
  }

  _handleFileOpened(event) {
    const { path, name, content } = event.detail;
    // Check if a tab for this path already exists
    // Using a temporary way to access _tabs for now, will refine (as _tabs is private)
    const existingTab = Array.from(this.wssTabs._tabs || []).find(
      (tab) => tab.path === path,
    );
    if (existingTab) {
      this.wssTabs.setActiveTab(existingTab.id);
      // Ensure editor content is updated in case file changed externally
      const editor = this.editorInstances.get(existingTab.id);
      if (editor) {
        editor.loadContent(content);
      }
    } else {
      // Create a new tab and editor for the file, passing the content
      this.wssTabs.addTab(name, path, undefined, content); // Pass path as id, name, and content
    }
  }

  _handleRenameTab(event) {
    const {
      "tab-id": tabId,
      "new-name": newName,
      "new-path": newPath,
    } = event.detail;
    console.log("changing tab name:", tabId, newName, newPath, this);

    this.wssTabs.renameTab(tabId, newName, newPath);
    // const editor = this.editorInstances.get(tabId);
  }

  activateEditor(id) {
    if (this.activeTabId === id) return;

    if (this.activeTabId) {
      const currentEditor = this.editorInstances.get(this.activeTabId);
      if (currentEditor) {
        // Save current editor's state (e.g., scroll, cursor, content)
        // this.editorStates.set(this.activeTabId, currentEditor.getState());
        currentEditor.classList.remove("active");
      }
    }

    const newEditor = this.editorInstances.get(id);
    if (newEditor) {
      newEditor.classList.add("active");
      newEditor.focus();
      // Restore editor's state
      // const savedState = this.editorStates.get(id);
      // if (savedState) newEditor.setState(savedState);
      this.activeTabId = id;
    }
  }
}

globalThis.customElements.define("wss-workspace", WssWorkspace);

import { gen_hash } from "../lib.js";

export class WssTabs extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tabs = [];
    this._activeTab = null;
  }

  async connectedCallback() {
    const css = await this._fetchCSS();
    this.shadowRoot.innerHTML = `
      <style>
        ${css}
      </style>
      <div id="tabs-container">
        <div id="add-btn" class="add-btn">+</div>
      </div>
    `;
    this._tabsContainer = this.shadowRoot.getElementById("tabs-container");
    this._addBtn = this.shadowRoot.getElementById("add-btn");
    this._addBtn.addEventListener("click", () => this.addTab());
    this.addTab();
  }

  async _fetchCSS() {
    try {
      const response = await fetch("/web/src/tabs/tabs.css");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error("Error fetching CSS:", error);
      return ""; // Return empty string or some default styles
    }
  }

  addTab(name = "untitled", path = "/untitled", id, initialContent = "") {
    // New signature with id
    const tab = {
      id: id ?? gen_hash(),
      path,
      name,
    };
    this._tabs.push(tab);
    this.setActiveTab(tab.id); // This will dispatch tab-activated

    this.dispatchEvent(
      new CustomEvent("tab-added", {
        detail: { id: tab.id, path: tab.path, name: tab.name, initialContent },
        bubbles: true,
        composed: true,
      }),
    );
    this.render();
  }

  closeTab(tabId) {
    const closedTab = this._tabs.find((tab) => tab.id === tabId);
    if (!closedTab) return;

    this._tabs = this._tabs.filter((tab) => tab.id !== tabId);

    this.dispatchEvent(
      new CustomEvent("tab-closed", {
        detail: { id: closedTab.id },
        bubbles: true,
        composed: true,
      }),
    );

    if (this._activeTab === tabId) {
      if (this._tabs.length > 0) {
        this.setActiveTab(this._tabs[this._tabs.length - 1].id);
      } else {
        this.addTab(); // Adds a new tab and sets it active, which dispatches tab-added and tab-activated
      }
    }
    this.render();
  }

  setActiveTab(tabId) {
    if (this._activeTab === tabId) return; // No change, no event

    this._activeTab = tabId;
    this.dispatchEvent(
      new CustomEvent("tab-activated", {
        detail: { id: tabId },
        bubbles: true,
        composed: true,
      }),
    );
    this.render();
  }

  renameTab(tabId, newName, newPath) {
    const tab = this._tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.name = newName;
      tab.path = newPath;
      this.render();
    }
  }

  render() {
    if (!this._tabsContainer) return;
    // Clear all existing tabs, but keep the add button
    const addButton = this._tabsContainer.querySelector("#add-btn");
    this._tabsContainer.innerHTML = "";
    this._tabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = "tab";
      if (tab.id === this._activeTab) {
        tabEl.classList.add("active");
      }
      tabEl.innerHTML = `
        <span class="tab-name">${tab.name}</span>
        <div class="close-btn">x</div>
      `;
      tabEl.querySelector(".close-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
      tabEl.addEventListener("click", () => this.setActiveTab(tab.id));
      this._tabsContainer.appendChild(tabEl);
    });
    // Append the add button back after all tabs
    this._tabsContainer.appendChild(addButton);
  }
}

globalThis.customElements.define("wss-tabs", WssTabs);


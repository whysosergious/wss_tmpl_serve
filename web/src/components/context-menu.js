/**
 * @typedef {'file' | 'dir' | 'empty'} ContextType
 * @typedef {{
 *   type: ContextType;
 *   path: string;
 *   name: string;
 *   isDir: boolean;
 *   size?: number;
 *   modified?: string;
 * }} ContextData
 *
 * @typedef {{
 *   action: 'new-file' | 'new-folder' | 'rename' | 'delete';
 *   context: ContextData;
 *   path: string;
 * }} ContextActionDetail
 *
 * @typedef {{
 *   show(event: MouseEvent, context: ContextData): void;
 *   hide(): void;
 * }} WssContextMenuAPI
 */

class WssContextMenu extends HTMLElement {
  static styles = `
    :host {
      position: absolute !important; /* absolute, not fixed */
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #e0e0e0;
      background: #252526;
      border: 1px solid #404040;
      border-radius: 6px;
      box-shadow: 
        0 4px 12px rgba(0,0,0,0.4),
        0 0 0 1px rgba(255,255,255,0.05);
      overflow: hidden;
      min-width: 130px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: all 0.12s ease-out;
      backdrop-filter: blur(20px);
    }
    
    :host([open]) {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
    
    .menu {
      display: flex;
      flex-direction: column;
    }
    
    button {
      all: unset;
      width: 100%;
      padding: 8px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      font: inherit;
      border: none;
      background: transparent;
      white-space: nowrap;
      transition: background 0.1s ease;
    }
    
    button:hover {
      background: rgba(255,255,255,0.08);
    }
    
    button:active {
      background: rgba(255,255,255,0.12);
    }
    
    .icon {
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      opacity: 0.8;
    }
    
    .separator {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 2px 0;
    }
  `;

  /** @type {ContextData} */
  context = {};
  /** @private */
  handleClick = this.handleClick.bind(this);

  /** Store bound methods */
  #hideBound;
  #handleClickBound;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.context = {};
    this.#handleClickBound = this.handleClick.bind(this);
    this.#hideBound = this.hide.bind(this);
    this.render();
  }

  connectedCallback() {
    this.shadowRoot.addEventListener("click", this.#handleClickBound);
    document.addEventListener("click", this.#hideBound);
    document.addEventListener("contextmenu", this.#hideBound);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this.#hideBound);
    document.removeEventListener("contextmenu", this.#hideBound);
  }

  /** @param {MouseEvent} event */
  show(event, context) {
    this.context = context;
    this.style.left = `${event.pageX}px`;
    this.style.top = `${event.pageY}px`;
    this.renderMenu();
    this.setAttribute("open", "");
    event.preventDefault();
    event.stopPropagation();
  }

  /** Properly bound hide method */
  hide() {
    this.removeAttribute("open");
  }

  /** @private */
  renderMenu() {
    const menu = /** @type {HTMLDivElement} */ (
      this.shadowRoot.querySelector(".menu")
    );
    const { type, isDir } = this.context;

    const items = [
      ...(type !== "empty"
        ? [
            {
              label: isDir ? "New Folder" : "New File",
              action: isDir ? "new-folder" : "new-file",
              icon: "",
            },
          ]
        : []),
      ...(type !== "empty"
        ? [{ label: "Rename", action: "rename", icon: "" }, { separator: true }]
        : []),
      ...(type !== "empty"
        ? [{ label: "Delete", action: "delete", icon: "" }]
        : []),
      ...(type === "empty"
        ? [
            { label: "New Folder", action: "new-folder", icon: "" },
            { label: "New File", action: "new-file", icon: "" },
          ]
        : []),
    ];

    menu.innerHTML = items
      .map((item) =>
        item.separator
          ? '<div class="separator"></div>'
          : `<button data-action="${item.action}">${item.label}</button>`,
      )
      .join("");
  }

  /** @private */
  handleClick(e) {
    e.stopPropagation();
    const btn = e.target.closest("button");
    if (!btn) return;

    /** @type {'new-file' | 'new-folder' | 'rename' | 'delete'} */
    const action = /** @type {HTMLButtonElement} */ (btn).dataset.action;

    this.dispatchEvent(
      new CustomEvent("context-action", {
        detail: /** @type {ContextActionDetail} */ ({
          action,
          context: this.context,
          path: this.context.path,
        }),
        bubbles: true,
        composed: true,
      }),
    );

    this.hide();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${WssContextMenu.styles}</style>
      <div class="menu"></div>
    `;
  }
}

customElements.define("wss-context-menu", WssContextMenu);

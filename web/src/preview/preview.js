export class WssPreviewPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }
        .preview-toolbar {
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #ccc;
          font-size: 12px;
          flex-shrink: 0;
        }
        .resizable-iframe-container {
          position: relative;
          border: 1px solid #444;
          width: 96%; /* 96% of parent */
          margin: 10px auto; /* Center horizontally, provide top margin */
          height: 50%; /* Default height, will be resized by JS */
          overflow: visible;
        }
        #preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background-color: #fff;
        }
        .iframe-resizer-bottom {
          position: absolute;
          width: 100%;
          height: 5px;
          bottom: -2.5px;
          left: 0;
          cursor: ns-resize;
          background: #007acc;
          z-index: 20;
        }
      </style>
      <div class="preview-toolbar">
        <span id="preview-dimensions"></span>
      </div>
      <div class="resizable-iframe-container">
        <iframe src="/project/index.html" id="preview-iframe"></iframe>
        <div class="iframe-resizer-bottom"></div>
      </div>
    `;

    this.iframeContainer = this.shadowRoot.querySelector(
      ".resizable-iframe-container",
    );
    this.iframe = this.shadowRoot.querySelector("#preview-iframe");
    this.dimensionsDisplay = this.shadowRoot.querySelector(
      "#preview-dimensions",
    );
    this.bottomResizer = this.shadowRoot.querySelector(".iframe-resizer-bottom");

    this.resizeObserver = new ResizeObserver(() => this.updateDimensions());

    this.applySavedLayout();
    this.initIframeResizing();
  }

  connectedCallback() {
    // Observe the custom element itself for size changes
    this.resizeObserver.observe(this);
    this.updateDimensions(); // Initial update when connected
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
  }

  applySavedLayout() {
    // Restore inner iframe height
    const savedIframeHeight = localStorage.getItem("previewIframeHeight");
    if (savedIframeHeight) {
      this.iframeContainer.style.height = savedIframeHeight;
    }
  }

  initIframeResizing() {
    this.bottomResizer.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.iframe.style.pointerEvents = "none"; // Disable iframe interaction during resize

      const initialHeight = this.iframeContainer.offsetHeight;
      const initialMouseY = e.clientY;

      const mouseMoveHandler = (event) => {
        const deltaY = event.clientY - initialMouseY;
        let newHeight = initialHeight + deltaY;

        if (newHeight >= 50) {
          // Minimum height
          this.iframeContainer.style.height = `${newHeight}px`;
        }
        this.updateDimensions();
      };

      const mouseUpHandler = () => {
        this.iframe.style.pointerEvents = ""; // Re-enable iframe interaction
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
        localStorage.setItem(
          "previewIframeHeight",
          this.iframeContainer.style.height,
        );
      };

      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    });
  }

  updateDimensions() {
    const width = this.iframeContainer.offsetWidth;
    const height = this.iframeContainer.offsetHeight;
    this.dimensionsDisplay.textContent = `${width}px x ${height}px`;
  }
}

customElements.define("wss-preview-panel", WssPreviewPanel);

import sh from "../sh.js";
import { decodeMulti } from "../lib.js";

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
        .zoom-controls {
          display: flex;
          position: relative;
          align-items: center;
        }
        .zoom-controls svg {
          margin-right: 2px;
        }
        .preview-toolbar button {
          background: none;
          border: 1px solid #555;
          border: none;
          width: 20px;
          color: #ccc;
          padding: 2px 5px;
          cursor: pointer;
          border-radius: 3px;
        }
        .preview-toolbar button:hover {
          background: #007acc;
          border-color: #007acc;
        }
        .resizable-iframe-container {
          position: relative;
          border: 1px solid #444;
          width: 96%; /* 96% of parent */
          margin: 10px auto; /* Center horizontally, provide top margin */
          height: 50%; /* Default height, will be resized by JS */
          overflow: hidden; /* Changed from visible to hidden to clip content outside the container */
        }
        #preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background-color: #fff;
          transform-origin: top left;
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
        <div class="zoom-controls">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <button id="zoom-out">-</button>
          <span id="zoom-percentage">100%</span>
          <button id="zoom-in">+</button>
        </div>
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
    this.bottomResizer = this.shadowRoot.querySelector(
      ".iframe-resizer-bottom",
    );
    this.zoomOutButton = this.shadowRoot.querySelector("#zoom-out");
    this.zoomInButton = this.shadowRoot.querySelector("#zoom-in");
    this.zoomPercentageDisplay =
      this.shadowRoot.querySelector("#zoom-percentage");

    // Load zoom level from localStorage, or use default
    const savedZoomLevel = localStorage.getItem("previewZoomLevel");
    this.zoomLevel = savedZoomLevel ? parseFloat(savedZoomLevel) : 0.5;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateDimensions();
    });

    this.applySavedLayout();
    this.initIframeResizing();
    this.initZoomControls();
    this.initWsListener();
  }

  connectedCallback() {
    // Observe the custom element itself for size changes
    this.resizeObserver.observe(this);
    // Also observe the iframeContainer directly
    this.resizeObserver.observe(this.iframeContainer);
    this.updateDimensions(); // Initial update when connected
    this.applyZoom(); // Apply initial zoom level
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

  initZoomControls() {
    this.zoomOutButton.addEventListener("click", () => this.zoomOut());
    this.zoomInButton.addEventListener("click", () => this.zoomIn());
  }

  zoomIn() {
    this.zoomLevel = Math.min(2.0, this.zoomLevel + 0.1); // Max zoom 200%
    this.applyZoom();
  }

  zoomOut() {
    this.zoomLevel = Math.max(0.1, this.zoomLevel - 0.1); // Min zoom 10%
    this.applyZoom();
  }

  applyZoom() {
    this.iframe.style.transform = `scale(${this.zoomLevel})`;
    this.zoomPercentageDisplay.textContent = `${Math.round(
      this.zoomLevel * 100,
    )}%`;
    this.updateDimensions(); // Update dimensions after zoom changes
    localStorage.setItem("previewZoomLevel", this.zoomLevel.toString()); // Save to localStorage
  }

  updateDimensions() {
    // Get the actual width and height of the iframeContainer
    const containerWidth = this.iframeContainer.offsetWidth;
    const containerHeight = this.iframeContainer.offsetHeight;

    // Calculate the 'original' dimensions of the iframe if it were at 100% zoom
    // These are the dimensions the user would perceive if not zoomed
    const originalWidth = containerWidth / this.zoomLevel;
    const originalHeight = containerHeight / this.zoomLevel;

    this.dimensionsDisplay.textContent = `${Math.round(
      originalWidth,
    )}px x ${Math.round(originalHeight)}px`;

    // Adjust iframe size to ensure it fills the container's calculated 'original' size
    // This is important for scrolling and content layout within the iframe
    this.iframe.style.width = `${originalWidth}px`;
    this.iframe.style.height = `${originalHeight}px`;
  }

  initWsListener() {
    sh.ws.ready.promise.then(() => {
      sh.ws.instance.addEventListener("message", async (event) => {
        let arrayBuffer;
        if (event.data instanceof Blob) {
          arrayBuffer = await event.data.arrayBuffer();
        } else if (event.data instanceof ArrayBuffer) {
          arrayBuffer = event.data;
        } else {
          return; // Ignore non-binary messages for this handler
        }

        try {
          const unpackedMessages = decodeMulti(new Uint8Array(arrayBuffer));
          for (const unpacked of unpackedMessages) {
            if (unpacked && (unpacked.Reload || unpacked.CssUpdate)) {
              this.iframe.contentWindow.postMessage(unpacked, "*");
            }
          }
        } catch (e) {
          console.error(
            "[Preview] MessagePack decode error for watcher event:",
            e,
          );
        }
      });
    });
  }
}

customElements.define("wss-preview-panel", WssPreviewPanel);

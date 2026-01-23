export class WssOverwriteConfirmModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .modal-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: #252526;
          padding: 20px;
          border-radius: 5px;
          width: 400px;
        }
        .modal-content h2 {
          margin-top: 0;
        }
        .modal-buttons {
          display: flex;
          justify-content: flex-end;
        }
        .modal-buttons button {
          padding: 8px 12px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          margin-left: 10px;
        }
        #overwrite-yes-button {
          background-color: #007acc;
          color: #ffffff;
        }
        #overwrite-no-button {
          background-color: #3e3e3e;
          color: #cccccc;
        }
      </style>
      <div id="overwrite-confirm-modal" class="modal-container" tabindex="-1">
        <div class="modal-content">
          <h2>File Exists</h2>
          <p>The file already exists. Do you want to overwrite it?</p>
          <div class="modal-buttons">
            <button id="overwrite-yes-button">Yes</button>
            <button id="overwrite-no-button">No</button>
          </div>
        </div>
      </div>
    `;
  }

  show() {
    const modalContainer = this.shadowRoot.querySelector(".modal-container");
    modalContainer.style.display = "flex";
    modalContainer.focus();

    return new Promise((resolve, reject) => {
      const yesButton = this.shadowRoot.querySelector("#overwrite-yes-button");
      const noButton = this.shadowRoot.querySelector("#overwrite-no-button");

      const onYes = () => {
        cleanup();
        resolve();
      };

      const onNo = () => {
        cleanup();
        reject();
      };

      const onKeyDown = (e) => {
        if (e.key === "Enter") {
          onYes();
        } else if (e.key === "Escape") {
          onNo();
        }
      };

      const cleanup = () => {
        modalContainer.style.display = "none";
        yesButton.removeEventListener("click", onYes);
        noButton.removeEventListener("click", onNo);
        modalContainer.removeEventListener("keydown", onKeyDown);
      };

      yesButton.addEventListener("click", onYes);
      noButton.addEventListener("click", onNo);
      modalContainer.addEventListener("keydown", onKeyDown);
    });
  }
}

globalThis.customElements.define("wss-overwrite-confirm-modal", WssOverwriteConfirmModal);

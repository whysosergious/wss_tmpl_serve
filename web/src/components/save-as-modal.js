export class WssSaveAsModal extends HTMLElement {
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
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
        }
        .form-group input {
          width: 100%;
          padding: 8px;
          border-radius: 3px;
          border: 1px solid #3e3e3e;
          background-color: #3c3c3c;
          color: #cccccc;
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
        #save-button {
          background-color: #007acc;
          color: #ffffff;
        }
        #cancel-button {
          background-color: #3e3e3e;
          color: #cccccc;
        }
      </style>
      <div id="save-as-modal" class="modal-container" tabindex="-1">
        <div class="modal-content">
          <h2>Save As</h2>
          <div class="form-group">
            <label for="file-path">Path (relative to project root):</label>
            <input type="text" id="file-path" name="file-path" />
          </div>
          <div class="form-group">
            <label for="file-name">Name:</label>
            <input type="text" id="file-name" name="file-name" />
          </div>
          <div class="modal-buttons">
            <button id="save-button">Save</button>
            <button id="cancel-button">Cancel</button>
          </div>
        </div>
      </div>
    `;
  }

  show({ path, name }) {
    const modalContainer = this.shadowRoot.querySelector(".modal-container");
    modalContainer.style.display = "flex";
    this.shadowRoot.querySelector("#file-path").value = path;
    this.shadowRoot.querySelector("#file-name").value = name;
    this.shadowRoot.querySelector("#file-name").focus();
    modalContainer.focus();

    return new Promise((resolve, reject) => {
      const saveButton = this.shadowRoot.querySelector("#save-button");
      const cancelButton = this.shadowRoot.querySelector("#cancel-button");

      const onSave = () => {
        const newPath = this.shadowRoot.querySelector("#file-path").value;
        const newName = this.shadowRoot.querySelector("#file-name").value;
        cleanup();
        resolve({ path: newPath, name: newName });
      };

      const onCancel = () => {
        cleanup();
        reject();
      };

      const onKeyDown = (e) => {
        if (e.key === "Enter") {
          onSave();
        } else if (e.key === "Escape") {
          onCancel();
        }
      };

      const cleanup = () => {
        modalContainer.style.display = "none";
        saveButton.removeEventListener("click", onSave);
        cancelButton.removeEventListener("click", onCancel);
        modalContainer.removeEventListener("keydown", onKeyDown);
      };

      saveButton.addEventListener("click", onSave);
      cancelButton.addEventListener("click", onCancel);
      modalContainer.addEventListener("keydown", onKeyDown);
    });
  }
}

globalThis.customElements.define("wss-save-as-modal", WssSaveAsModal);

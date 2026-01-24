import { create_el } from "../lib.js";

export class WssPrompt extends HTMLElement {
  title = new Text("title");
  message = new Text("msg");
  confirm_text = new Text("Ok");
  cancel_text = new Text("Cancel");

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
          text-align: center;
          background-color: #252526;
          padding: 20px;
          border-radius: 5px;
          width: 400px;
        }
        .modal-content h2 {
          font-size: 21px;
          margin-top: 0;
          margin-bottom: 8px;
        }
        .modal-content p {
          font-size: 14px;
          margin-bottom: 30px;
        }

        .modal-buttons {
          display: flex;
          justify-content:center;
        }
        .modal-buttons button {
          padding: 7px 21px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          margin: 0px 4px;
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
    `;
    // <div id="overwrite-confirm-modal" class="modal-container" tabindex="-1">
    //   <div class="modal-content">
    //     <h2 id="promptTitle">File Exists</h2>
    //     <p id="promptMessage">...</p>
    //     <div class="modal-buttons">
    //       <button id="promptConfirmButton">Ok</button>
    //     </div>
    //   </div>
    // </div>

    this.confirm_btn = create_el("button", {
      children: [this.confirm_text],
    });
    this.cancel_btn = create_el("button", {
      children: [this.cancel_text],
    });

    this.container = create_el("div", {
      attr: {
        id: "wssPromptContainer",
        class: "modal-container",
        tabindex: "-1",
      },
      children: [
        create_el("div", {
          attr: { class: "modal-content" },
          children: [
            create_el("h2", {
              children: [this.title],
            }),
            create_el("p", {
              children: [this.message],
            }),
            create_el("div", {
              attr: {
                class: "modal-buttons",
              },
              children: [this.confirm_btn, this.cancel_btn],
            }),
          ],
        }),
      ],
    });

    this.shadowRoot.appendChild(this.container);
  }

  connectedCallback() {
    sh.components.prompt = this;
  }

  show({
    title = "title",
    msg = "message",
    confirm = "ok",
    cancel = null,
  } = {}) {
    console.log(this);
    this.title.data = title;
    this.message.data = msg;
    this.confirm_text.data = confirm;

    // hide the 'cancel' button if cancel prop is null
    if (cancel) {
      this.cancel_btn.style.display = "";
      this.cancel_text.data = cancel;
    } else {
      this.cancel_btn.style.display = "none";
    }

    this.container.style.display = "flex";
    this.container.focus();

    return new Promise((resolve, reject) => {
      const on_confirm = () => {
        cleanup();
        resolve();
      };

      const on_cancel = () => {
        cleanup();
        reject();
      };

      const on_key_down = (e) => {
        if (e.key === "Enter") {
          on_confirm();
        } else if (e.key === "Escape") {
          on_cancel();
        }
      };

      const cleanup = () => {
        this.container.style.display = "none";
        this.confirm_btn.removeEventListener("click", on_confirm);
        this.cancel_btn.removeEventListener("click", on_cancel);
        this.container.removeEventListener("keydown", on_key_down);
      };

      this.confirm_btn.addEventListener("click", on_confirm);
      this.cancel_btn.addEventListener("click", on_cancel);
      this.container.addEventListener("keydown", on_key_down);
    });
  }
}

globalThis.customElements.define("wss-prompt", WssPrompt);

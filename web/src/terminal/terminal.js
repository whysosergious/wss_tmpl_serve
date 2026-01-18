import { connectAndProvideSend } from "./ws_connection.js";

class WssTerminal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.history = [];
    this.historyIndex = -1;
    this._wsSend = null; // To store the websocket send function

    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    background-color: #1e1e1e;
                    color: #00ff00; /* Green text for terminal feel */
                    font-family: 'Fira Code', 'JetBrains Mono', 'Menlo', 'Consolas', monospace;
                    font-size: 14px;
                    box-sizing: border-box;
                    overflow: hidden; /* Prevent host scrollbars */
                }

                /* Placeholder for custom font */
                @font-face {
                    font-family: 'Fira Code';
                    src: url('./fonts/FiraCode-Regular.woff2') format('woff2'),
                         url('./fonts/FiraCode-Regular.woff') format('woff');
                    font-weight: normal;
                    font-style: normal;
                    /* Place your custom font files in web/src/terminal/fonts/ */
                }

                .terminal-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    padding: 10px;
                    box-sizing: border-box;
                }

                .output {
                    flex-grow: 1;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    padding-right: 5px; /* Space for scrollbar */
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column-reverse; /* For bottom-up scrolling */
                }

                .output::-webkit-scrollbar {
                    width: 8px;
                }

                .output::-webkit-scrollbar-track {
                    background: #333;
                }

                .output::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 4px;
                }

                .output::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }

                .input-line {
                    display: flex;
                    align-items: flex-start; /* Align prompt to top of textarea */
                }

                .prompt {
                    color: #00ff00; /* Green prompt */
                    margin-right: 5px;
                    line-height: 1.5; /* Match textarea line-height */
                    padding-top: 5px; /* Align with text in textarea */
                }

                .input-area {
                    flex-grow: 1;
                    background-color: #1e1e1e;
                    color: #00ff00;
                    border: none;
                    outline: none;
                    resize: none; /* Disable manual resize */
                    font-family: inherit;
                    font-size: inherit;
                    caret-color: #00ff00;
                    padding: 5px;
                    box-sizing: border-box;
                    min-height: 28px; /* Single line height */
                    overflow-y: hidden; /* Hide scrollbar until needed */
                    line-height: 1.5;
                }
            </style>
            <div class="terminal-container">
                <div class="output"></div>
                <div class="input-line">
                    <span class="prompt">> </span>
                    <textarea class="input-area" rows="1" spellcheck="false" autofocus></textarea>
                </div>
            </div>
        `;

    this.outputElement = this.shadowRoot.querySelector(".output");
    this.inputElement = this.shadowRoot.querySelector(".input-area");

    this.inputElement.addEventListener("keydown", this.handleInput.bind(this));
    this.inputElement.addEventListener("input", this.resizeInput.bind(this));
    this.inputElement.addEventListener("focus", () => {
      this.inputElement.style.borderColor = "#00ff00"; // Highlight on focus
    });
    this.inputElement.addEventListener("blur", () => {
      this.inputElement.style.borderColor = "transparent"; // Remove highlight on blur
    });

    this.addEventListener("click", () => {
      this.inputElement.focus();
    });

    // Initial focus
    this.inputElement.focus();
    // this.println('Welcome to WSS Terminal!'); // Removed
    // this.println('Type "help" for a list of commands.'); // Removed
  }

  connectedCallback() {
    this.inputElement.focus();
    globalThis.ws_send = this._wsSend = connectAndProvideSend(
      window.location.origin + "/ws/",
      this,
    );
  }

  println(text, color = "#00ff00") {
    const line = document.createElement("div");
    line.textContent = text;
    line.style.color = color;
    this.outputElement.prepend(line); // Prepend for bottom-up scrolling
    // No need to scroll if we use flex-direction: column-reverse on the output container
    // this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }

  handleInput(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const command = this.inputElement.value.trim();
      this.inputElement.value = ""; // Clear input
      this.resizeInput(); // Reset input height

      if (command) {
        this.history.unshift(command); // Add to history
        this.historyIndex = -1; // Reset history index
        this.println(`> ${command}`); // Echo command to output
        this.executeCommand(command);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (
        this.history.length > 0 &&
        this.historyIndex < this.history.length - 1
      ) {
        this.historyIndex++;
        this.inputElement.value = this.history[this.historyIndex];
        this.inputElement.selectionStart = this.inputElement.selectionEnd =
          this.inputElement.value.length;
        this.resizeInput();
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputElement.value = this.history[this.historyIndex];
        this.inputElement.selectionStart = this.inputElement.selectionEnd =
          this.inputElement.value.length;
        this.resizeInput();
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.inputElement.value = "";
        this.resizeInput();
      }
    }
  }

  resizeInput() {
    this.inputElement.style.height = "auto";
    this.inputElement.style.height = this.inputElement.scrollHeight + "px";
  }

  executeCommand(command) {
    switch (command.toLowerCase()) {
      case "help":
        this.println("Available commands:");
        this.println("  help         - Show this help message");
        this.println("  clear        - Clear the terminal output");
        this.println(
          "  Any other command will be sent to the server via WebSocket.",
        );
        break;
      case "clear":
        this.outputElement.innerHTML = "";
        break;
      default:
        if (this._wsSend) {
          this._wsSend(command);
        } else {
          this.println(
            `WebSocket not connected. Command not sent: ${command}`,
            "#ff0000",
          );
        }
        break;
    }
  }
}

customElements.define("wss-terminal", WssTerminal);

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.1.9";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";

export class WssEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>
      .cm-editor { height: 100%; }
    </style>`;

    new EditorView({
      doc: "console.log('hello');\n",
      extensions: [basicSetup, javascript(), oneDark],
      parent: this.shadowRoot,
    });
  }
}

customElements.define("wss-editor", WssEditor);

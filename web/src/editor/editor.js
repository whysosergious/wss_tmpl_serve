import {
  EditorView,
  basicSetup,
  javascript,
  oneDark,
  keymap,
} from "./pme/pme.mod.js";

export class WssEditor extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const customKeymap = keymap.of([
      {
        key: "Control-Enter", // Standard lowercase
        shift: false,
        run: (view) => {
          const code = view.state.doc.toString();
          try {
            globalThis.eval(code);
          } catch (e) {
            console.error(e);
          }
          return true;
        },
      },
    ]);

    this.view = new EditorView({
      doc: "console.log('hello');\n",
      extensions: [customKeymap, javascript(), oneDark, basicSetup],
      parent: this,
    });
  }
}

globalThis.customElements.define("wss-editor", WssEditor);

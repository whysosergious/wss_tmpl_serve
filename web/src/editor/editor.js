import {
  Compartment,
  EditorState,
  EditorView,
  basicSetup,
  javascript,
  javascriptLanguage,
  oneDark,
  autocompletion,
} from "./pme/pme.mod.js";
import { customKeymap } from "./keymaps.js";
import { gen_hash } from "/src/lib.js"; // This might not be needed if id is from tab-id

// completions
import { globalCompletions } from "./completions.js";

// themes
import { nord } from "./themes/nord.js";
import { materialDark } from "./themes/material-dark.js";
import { gruvboxDark } from "./themes/gruvbox-dark.js";
import { gruvboxLight } from "./themes/gruvbox-light.js";

// dev
import sh from "/src/sh.js";
sh.editors ??= {};

sh.pme = {
  themes: {
    nord,
    oneDark,
    materialDark,
    gruvboxLight,
    gruvboxDark,
  },
};

export class WssEditor extends HTMLElement {
  id = null; // Will be set from 'tab-id' attribute
  filename = "untitled";
  filetype = undefined;
  path = "/";
  view; // EditorView instance

  constructor() {
    super();
  }

  /// compartments
  language = new Compartment();
  theme = new Compartment();

  connectedCallback() {
    this.id = this.getAttribute("tab-id") || gen_hash(); // Use tab-id if available, otherwise generate

    this.state = EditorState.create({
      doc: this.initialContent || "", // Start with empty content or provided initialContent
      extensions: [
        customKeymap,
        basicSetup,
        this.theme.of(oneDark),
        this.language.of(javascript({ typescript: true, autocomplete: true })),
        globalCompletions,
        autocompletion(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.dispatchEvent(new CustomEvent("editor-content-changed", {
              detail: { id: this.id, content: this.getContent() },
              bubbles: true,
              composed: true,
            }));
          }
        })
      ],
    });
    this.view = new EditorView({
      state: this.state,
      parent: this,
    });

    sh.editors[this.id] = this;
  }

  disconnectedCallback() {
    this.view.destroy(); // Clean up CodeMirror view
    delete sh.editors[this.id];
  }

  /**
   * Sets the content of the editor.
   * @param {string} content The new content for the editor.
   */
  loadContent(content) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content }
    });
  }

  /**
   * Returns the current content of the editor.
   * @returns {string} The current content of the editor.
   */
  getContent() {
    return this.view.state.doc.toString();
  }

  /**
   * Gives focus to the editor instance.
   */
  focus() {
    this.view.focus();
  }

  setLanguage(language) {
    this.view.dispatch({
      effects: this.language.reconfigure(language),
    });
  }

  setTheme(theme) {
    this.view.dispatch({
      effects: this.theme.reconfigure(theme),
    });
  }
}

globalThis.customElements.define("wss-editor", WssEditor);

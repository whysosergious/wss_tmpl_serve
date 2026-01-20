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
import { gen_hash } from "/src/lib.js";

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
  id;
  filename = "untitled";
  filetype = undefined;
  path = "/";

  constructor() {
    super();
  }

  /// compartments
  language = new Compartment();
  theme = new Compartment();

  connectedCallback() {
    this.id = gen_hash();

    this.state = EditorState.create({
      doc: "console.log('hello');\n",
      extensions: [
        customKeymap,
        basicSetup,
        this.theme.of(oneDark),
        this.language.of(javascript({ typescript: true, autocomplete: true })),
        globalCompletions,
        autocompletion(),
      ],
    });
    this.view = new EditorView({
      state: this.state,
      parent: this,
    });

    sh.editors[this.id] = this;
  }

  disconnectedCallback() {
    delete sh.editors[this.id];
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

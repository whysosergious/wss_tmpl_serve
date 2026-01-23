import {
  Compartment,
  EditorState,
  EditorView,
  basicSetup,
  oneDark,
  autocompletion,
} from "./pme/pme.mod.js";
import { customKeymap } from "./keymaps.js";
import { gen_hash } from "/src/lib.js"; // This might not be needed if id is from tab-id

// custom plugins
import { lang_by_ext } from "./plugins/language_switcher.js";

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
  name = "untitled";
  ext = undefined;
  path = "/";
  view; // EditorView instance

  constructor() {
    super();
  }

  /// compartments
  language = new Compartment();
  theme = new Compartment();

  connectedCallback() {
    this.id = gen_hash(); // Use tab-id if available, otherwise generate
    const { path, name, ext } = this.split_fullpath(
      this.getAttribute("tab-id"),
    );
    this.path = path;
    this.name = name;
    this.ext = ext;

    this.state = EditorState.create({
      doc: this.initialContent || "", // Start with empty content or provided initialContent
      extensions: [
        customKeymap,
        basicSetup,
        this.theme.of(oneDark),
        this.language.of([]),
        autocompletion(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.dispatchEvent(
              new CustomEvent("editor-content-changed", {
                detail: { id: this.id, content: this.getContent() },
                bubbles: true,
                composed: true,
              }),
            );
          }
        }),
      ],
    });
    this.view = new EditorView({
      state: this.state,
      parent: this,
    });

    sh.editors[this.id] = this;

    this.addEventListener("save", this.save);
    this.addEventListener("save-as", this.saveAs);

    /// load language support by ext (defaults to js)
    lang_by_ext(ext).then((res) => {
      this.setLanguage([res]);
    });
  }

  disconnectedCallback() {
    this.view.destroy(); // Clean up CodeMirror view
    delete sh.editors[this.id];
    this.removeEventListener("save", this.save);
    this.removeEventListener("save-as", this.saveAs);
  }

  _saveFile(force = false) {
    const content = this.getContent();
    // Proper escaping for shell
    const escaped_content = content.replaceAll("'", "'\\''");
    const force_flag = force ? "-f" : "";
    const command = `'${escaped_content}' | save ${force_flag} './${this.full_path}'`;
    sh.ws.send({
      type: "cmd",
      body: command,
    });

    this.dispatchEvent(
      new CustomEvent("rename-tab", {
        detail: {
          "tab-id": this.id,
          "new-name": this.full_path,
        },
        bubbles: true,
        composed: true,
      }),
    );

    const fileExplorer = document.querySelector("wss-file-explorer");
    if (fileExplorer) {
      fileExplorer.refresh_path(this.path);
    }
  }

  save = () => {
    if (this.name === "untitled") {
      this.saveAs();
    } else {
      this._saveFile(true);
    }
  };

  saveAs = async () => {
    await customElements.whenDefined("wss-save-as-modal");
    const saveAsModal = document.getElementById("save-as-modal-container");
    try {
      const { path, name: newName } = await saveAsModal.show({
        path: this.path,
        name: this.name,
      });

      let full_path = newName;
      if (path) {
        full_path = path.endsWith("/") ? path + newName : path + "/" + newName;
      }

      const {
        path: new_path,
        name,
        ext,
      } = this.split_fullpath(full_path);

      const file_exists_cmd = `'${full_path}' | path exists`;
      const res = await sh.ws.send({ type: "cmd", body: file_exists_cmd });
      const file_exists = res.body.trim() === "true";

      const save = () => {
        this.path = new_path;
        this.name = name;
        this.ext = ext;
        this._saveFile(true);
      };

      if (file_exists) {
        await customElements.whenDefined("wss-overwrite-confirm-modal");
        const overwriteModal = document.getElementById(
          "overwrite-confirm-modal-container",
        );
        try {
          await overwriteModal.show();
          save();
        } catch (e) {
          // User chose not to overwrite
          this.saveAs(); // Re-open the save as modal
        }
      } else {
        this.path = new_path;
        this.name = name;
        this.ext = ext;
        this._saveFile(false);
      }
    } catch (e) {
      // User canceled the save as modal
    }
  };

  /**
   * split fullpath of a file into path, base and extension
   * @returns ({path:string, name:string, ext:string|undefined})
   */
  split_fullpath(full_path) {
    const last_slash = full_path.lastIndexOf("/");
    const path = last_slash === -1 ? "" : full_path.slice(0, last_slash + 1);
    const full_name = full_path.slice(last_slash + 1); // may be "foo", ".env", ".gitignore", ""

    // No dot at all → extensionless
    const last_dot = full_name.lastIndexOf(".");

    // No dot or dot is first char (dotfile like ".env", ".gitignore")
    if (last_dot <= 0) {
      return {
        path,
        name: full_name, // "foo", ".env", ".gitignore"
        ext: "", // no extension
      };
    }

    // Normal case: "c.es.js" → "c.es" + "js"
    const name = full_name.slice(0, last_dot);
    const ext = full_name.slice(last_dot + 1);

    return { path, name, ext };
  }

  /**
   * join path, name and ext
   * @returns (string)
   */
  get full_path() {
    const _ext = this.ext.length ? "." + this.ext : this.ext;

    return this.path + this.name + _ext;
  }

  /**
   * Sets the content of the editor.
   * @param {string} content The new content for the editor.
   */
  loadContent(content) {
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: content },
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

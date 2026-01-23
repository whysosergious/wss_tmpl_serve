import { keymap, toggleLineComment, indentWithTab } from "./pme/pme.mod.js";

/// code keymaps
export const customKeymap = keymap.of([
  indentWithTab,
  {
    key: "Control-Enter",
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

  {
    key: "Alt-q",
    shift: false,
    run: toggleLineComment,
  },
  {
    key: "Control-s",
    run: (view) => {
      view.dom.dispatchEvent(new CustomEvent("save", { bubbles: true }));
      return true;
    },
  },
  {
    key: "Control-Shift-s",
    run: (view) => {
      view.dom.dispatchEvent(new CustomEvent("save-as", { bubbles: true }));
      return true;
    },
  },
]);

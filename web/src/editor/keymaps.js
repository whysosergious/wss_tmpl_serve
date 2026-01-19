import { keymap } from "./pme/pme.mod.js";

/// code keymaps
export const codeKeymap = keymap.of([
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
]);

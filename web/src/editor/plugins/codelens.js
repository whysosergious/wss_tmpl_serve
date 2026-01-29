// js-codelens.js
import {
  RangeSetBuilder,
  syntaxTree,
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
} from "../pme/pme.mod.js";

const codeLensDeco = Decoration.widget({
  side: -1,
  block: true,
  widget: new (class extends WidgetType {
    constructor() {
      super({ side: -1, block: true }); // ← Explicit constructor
    }

    toDOM(view) {
      const div = document.createElement("div");
      div.className = "cm-codelens";
      div.textContent = "3 refs • run tests";
      div.onclick = () => console.log("clicked");
      return div;
    }
  })(),
});

export const code_lens = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view) {
      this.decorations = this.build(view);
    }

    update(update) {
      if (update.docChanged) {
        this.decorations = this.build(update.view);
      }
    }

    build(view) {
      const builder = new RangeSetBuilder();
      syntaxTree(view.state)
        .cursor()
        .iterate((node) => {
          if (
            node.name === "FunctionDeclaration" ||
            node.name === "ArrowFunction"
          ) {
            builder.add(node.from, node.from, codeLensDeco);
          }
        });
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

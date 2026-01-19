/**
 * Bundled by jsDelivr using Rollup v2.79.2 and Terser v5.39.0.
 * Original file: /npm/@lezer/highlight@1.2.3/dist/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
import { NodeProp as t } from "./common.js";
let e = 0;
class a {
  constructor(t, a, i, o) {
    ((this.name = t),
      (this.set = a),
      (this.base = i),
      (this.modified = o),
      (this.id = e++));
  }
  toString() {
    let { name: t } = this;
    for (let e of this.modified) e.name && (t = `${e.name}(${t})`);
    return t;
  }
  static define(t, e) {
    let i = "string" == typeof t ? t : "?";
    if ((t instanceof a && (e = t), null == e ? void 0 : e.base))
      throw new Error("Can not derive from a modified tag");
    let o = new a(i, [], null, []);
    if ((o.set.push(o), e)) for (let t of e.set) o.set.push(t);
    return o;
  }
  static defineModifier(t) {
    let e = new o(t);
    return (t) =>
      t.modified.indexOf(e) > -1
        ? t
        : o.get(
            t.base || t,
            t.modified.concat(e).sort((t, e) => t.id - e.id),
          );
  }
}
let i = 0;
class o {
  constructor(t) {
    ((this.name = t), (this.instances = []), (this.id = i++));
  }
  static get(t, e) {
    if (!e.length) return t;
    let i = e[0].instances.find((a) => {
      return (
        a.base == t &&
        ((i = e),
        (o = a.modified),
        i.length == o.length && i.every((t, e) => t == o[e]))
      );
      var i, o;
    });
    if (i) return i;
    let r = [],
      n = new a(t.name, r, t, e);
    for (let t of e) t.instances.push(n);
    let s = (function (t) {
      let e = [[]];
      for (let a = 0; a < t.length; a++)
        for (let i = 0, o = e.length; i < o; i++) e.push(e[i].concat(t[a]));
      return e.sort((t, e) => e.length - t.length);
    })(e);
    for (let e of t.set)
      if (!e.modified.length) for (let t of s) r.push(o.get(e, t));
    return n;
  }
}
function r(t) {
  let e = Object.create(null);
  for (let a in t) {
    let i = t[a];
    Array.isArray(i) || (i = [i]);
    for (let t of a.split(" "))
      if (t) {
        let a = [],
          o = 2,
          r = t;
        for (let e = 0; ; ) {
          if ("..." == r && e > 0 && e + 3 == t.length) {
            o = 1;
            break;
          }
          let i = /^"(?:[^"\\]|\\.)*?"|[^\/!]+/.exec(r);
          if (!i) throw new RangeError("Invalid path: " + t);
          if (
            (a.push(
              "*" == i[0] ? "" : '"' == i[0][0] ? JSON.parse(i[0]) : i[0],
            ),
            (e += i[0].length),
            e == t.length)
          )
            break;
          let n = t[e++];
          if (e == t.length && "!" == n) {
            o = 0;
            break;
          }
          if ("/" != n) throw new RangeError("Invalid path: " + t);
          r = t.slice(e);
        }
        let n = a.length - 1,
          l = a[n];
        if (!l) throw new RangeError("Invalid path: " + t);
        let c = new s(i, o, n > 0 ? a.slice(0, n) : null);
        e[l] = c.sort(e[l]);
      }
  }
  return n.add(e);
}
const n = new t({
  combine(t, e) {
    let a, i, o;
    for (; t || e; ) {
      if (
        (!t || (e && t.depth >= e.depth)
          ? ((o = e), (e = e.next))
          : ((o = t), (t = t.next)),
        a && a.mode == o.mode && !o.context && !a.context)
      )
        continue;
      let r = new s(o.tags, o.mode, o.context);
      (a ? (a.next = r) : (i = r), (a = r));
    }
    return i;
  },
});
class s {
  constructor(t, e, a, i) {
    ((this.tags = t), (this.mode = e), (this.context = a), (this.next = i));
  }
  get opaque() {
    return 0 == this.mode;
  }
  get inherit() {
    return 1 == this.mode;
  }
  sort(t) {
    return !t || t.depth < this.depth
      ? ((this.next = t), this)
      : ((t.next = this.sort(t.next)), t);
  }
  get depth() {
    return this.context ? this.context.length : 0;
  }
}
function l(t, e) {
  let a = Object.create(null);
  for (let e of t)
    if (Array.isArray(e.tag)) for (let t of e.tag) a[t.id] = e.class;
    else a[e.tag.id] = e.class;
  let { scope: i, all: o = null } = e || {};
  return {
    style: (t) => {
      let e = o;
      for (let i of t)
        for (let t of i.set) {
          let i = a[t.id];
          if (i) {
            e = e ? e + " " + i : i;
            break;
          }
        }
      return e;
    },
    scope: i,
  };
}
function c(t, e, a, i = 0, o = t.length) {
  let r = new f(i, Array.isArray(e) ? e : [e], a);
  (r.highlightRange(t.cursor(), i, o, "", r.highlighters), r.flush(o));
}
function h(t, e, a, i, o, r = 0, n = t.length) {
  let s = r;
  function l(e, a) {
    if (!(e <= s)) {
      for (let r = t.slice(s, e), n = 0; ; ) {
        let t = r.indexOf("\n", n),
          e = t < 0 ? r.length : t;
        if ((e > n && i(r.slice(n, e), a), t < 0)) break;
        (o(), (n = t + 1));
      }
      s = e;
    }
  }
  (c(
    e,
    a,
    (t, e, a) => {
      (l(t, ""), l(e, a));
    },
    r,
    n,
  ),
    l(n, ""));
}
s.empty = new s([], 2, null);
class f {
  constructor(t, e, a) {
    ((this.at = t),
      (this.highlighters = e),
      (this.span = a),
      (this.class = ""));
  }
  startSpan(t, e) {
    e != this.class &&
      (this.flush(t), t > this.at && (this.at = t), (this.class = e));
  }
  flush(t) {
    t > this.at && this.class && this.span(this.at, t, this.class);
  }
  highlightRange(e, a, i, o, r) {
    let { type: n, from: l, to: c } = e;
    if (l >= i || c <= a) return;
    n.isTop && (r = this.highlighters.filter((t) => !t.scope || t.scope(n)));
    let h = o,
      f = g(e) || s.empty,
      d = (function (t, e) {
        let a = null;
        for (let i of t) {
          let t = i.style(e);
          t && (a = a ? a + " " + t : t);
        }
        return a;
      })(r, f.tags);
    if (
      (d &&
        (h && (h += " "), (h += d), 1 == f.mode && (o += (o ? " " : "") + d)),
      this.startSpan(Math.max(a, l), h),
      f.opaque)
    )
      return;
    let m = e.tree && e.tree.prop(t.mounted);
    if (m && m.overlay) {
      let t = e.node.enter(m.overlay[0].from + l, 1),
        n = this.highlighters.filter((t) => !t.scope || t.scope(m.tree.type)),
        s = e.firstChild();
      for (let f = 0, g = l; ; f++) {
        let d = f < m.overlay.length ? m.overlay[f] : null,
          p = d ? d.from + l : c,
          u = Math.max(a, g),
          k = Math.min(i, p);
        if (u < k && s)
          for (
            ;
            e.from < k &&
            (this.highlightRange(e, u, k, o, r),
            this.startSpan(Math.min(k, e.to), h),
            !(e.to >= p) && e.nextSibling());
          );
        if (!d || p > i) break;
        ((g = d.to + l),
          g > a &&
            (this.highlightRange(
              t.cursor(),
              Math.max(a, d.from + l),
              Math.min(i, g),
              "",
              n,
            ),
            this.startSpan(Math.min(i, g), h)));
      }
      s && e.parent();
    } else if (e.firstChild()) {
      m && (o = "");
      do {
        if (!(e.to <= a)) {
          if (e.from >= i) break;
          (this.highlightRange(e, a, i, o, r),
            this.startSpan(Math.min(i, e.to), h));
        }
      } while (e.nextSibling());
      e.parent();
    }
  }
}
function g(t) {
  let e = t.type.prop(n);
  for (; e && e.context && !t.matchContext(e.context); ) e = e.next;
  return e || null;
}
const d = a.define,
  m = d(),
  p = d(),
  u = d(p),
  k = d(p),
  b = d(),
  y = d(b),
  x = d(b),
  N = d(),
  w = d(N),
  v = d(),
  M = d(),
  O = d(),
  S = d(O),
  R = d(),
  C = {
    comment: m,
    lineComment: d(m),
    blockComment: d(m),
    docComment: d(m),
    name: p,
    variableName: d(p),
    typeName: u,
    tagName: d(u),
    propertyName: k,
    attributeName: d(k),
    className: d(p),
    labelName: d(p),
    namespace: d(p),
    macroName: d(p),
    literal: b,
    string: y,
    docString: d(y),
    character: d(y),
    attributeValue: d(y),
    number: x,
    integer: d(x),
    float: d(x),
    bool: d(b),
    regexp: d(b),
    escape: d(b),
    color: d(b),
    url: d(b),
    keyword: v,
    self: d(v),
    null: d(v),
    atom: d(v),
    unit: d(v),
    modifier: d(v),
    operatorKeyword: d(v),
    controlKeyword: d(v),
    definitionKeyword: d(v),
    moduleKeyword: d(v),
    operator: M,
    derefOperator: d(M),
    arithmeticOperator: d(M),
    logicOperator: d(M),
    bitwiseOperator: d(M),
    compareOperator: d(M),
    updateOperator: d(M),
    definitionOperator: d(M),
    typeOperator: d(M),
    controlOperator: d(M),
    punctuation: O,
    separator: d(O),
    bracket: S,
    angleBracket: d(S),
    squareBracket: d(S),
    paren: d(S),
    brace: d(S),
    content: N,
    heading: w,
    heading1: d(w),
    heading2: d(w),
    heading3: d(w),
    heading4: d(w),
    heading5: d(w),
    heading6: d(w),
    contentSeparator: d(N),
    list: d(N),
    quote: d(N),
    emphasis: d(N),
    strong: d(N),
    link: d(N),
    monospace: d(N),
    strikethrough: d(N),
    inserted: d(),
    deleted: d(),
    changed: d(),
    invalid: d(),
    meta: R,
    documentMeta: d(R),
    annotation: d(R),
    processingInstruction: d(R),
    definition: a.defineModifier("definition"),
    constant: a.defineModifier("constant"),
    function: a.defineModifier("function"),
    standard: a.defineModifier("standard"),
    local: a.defineModifier("local"),
    special: a.defineModifier("special"),
  };
for (let t in C) {
  let e = C[t];
  e instanceof a && (e.name = t);
}
const A = l([
  { tag: C.link, class: "tok-link" },
  { tag: C.heading, class: "tok-heading" },
  { tag: C.emphasis, class: "tok-emphasis" },
  { tag: C.strong, class: "tok-strong" },
  { tag: C.keyword, class: "tok-keyword" },
  { tag: C.atom, class: "tok-atom" },
  { tag: C.bool, class: "tok-bool" },
  { tag: C.url, class: "tok-url" },
  { tag: C.labelName, class: "tok-labelName" },
  { tag: C.inserted, class: "tok-inserted" },
  { tag: C.deleted, class: "tok-deleted" },
  { tag: C.literal, class: "tok-literal" },
  { tag: C.string, class: "tok-string" },
  { tag: C.number, class: "tok-number" },
  { tag: [C.regexp, C.escape, C.special(C.string)], class: "tok-string2" },
  { tag: C.variableName, class: "tok-variableName" },
  { tag: C.local(C.variableName), class: "tok-variableName tok-local" },
  {
    tag: C.definition(C.variableName),
    class: "tok-variableName tok-definition",
  },
  { tag: C.special(C.variableName), class: "tok-variableName2" },
  {
    tag: C.definition(C.propertyName),
    class: "tok-propertyName tok-definition",
  },
  { tag: C.typeName, class: "tok-typeName" },
  { tag: C.namespace, class: "tok-namespace" },
  { tag: C.className, class: "tok-className" },
  { tag: C.macroName, class: "tok-macroName" },
  { tag: C.propertyName, class: "tok-propertyName" },
  { tag: C.operator, class: "tok-operator" },
  { tag: C.comment, class: "tok-comment" },
  { tag: C.meta, class: "tok-meta" },
  { tag: C.invalid, class: "tok-invalid" },
  { tag: C.punctuation, class: "tok-punctuation" },
]);
export {
  a as Tag,
  A as classHighlighter,
  g as getStyleTags,
  h as highlightCode,
  c as highlightTree,
  r as styleTags,
  l as tagHighlighter,
  C as tags,
};
export default null;
//# sourceMappingURL=/sm/77676cbdd9a8e7fcf00a0b02e5ecdf78c4f2bc017e142feacc8845796ff30869.map

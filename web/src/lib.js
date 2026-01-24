export * from "https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3.1.3/dist.esm/index.mjs";

/// gens
/**
 *   @description - async generation of unique hash from a uuid
 *      Note: calls shell, doesn't require crypto/safe context
 *  @info - the 's' at 0 lets us do -> block.s235fvdbh insted of block['235fvdubh'] at runtime
 **/
export async function gen_hash_from_uuid(len = 8) {
  const uuid = await sh.wsb.call.gen("uuid");

  return "s" + uuid.replace(/\-/g, "").slice(0, len - 1);
}

/**
 *  @description - basic but unsafe(unique values not guaranteed) hash gen
 *  @info - the 's' at 0 lets us do -> block.s235fvdbh insted of block['235fvdubh'] at runtime
 **/
export function gen_hash(len = 8) {
  return (
    "s" +
    (Date.now() + ~~(Math.random() * 100000000)).toString(36).slice(2, len + 1)
  );
}

/**
 * everythimg unique identifier..
 * ?.@constructs > methods for:
 * '@example > uid.hash() > 136b28d7
 * '@example > uid.sqiid() > 1..2..3..
 * '@example > uid.uuid4() > 9742e134-2a70-4ad7-be1c-c0f4b44829f3
 */
export class MakeUID {
  constructor() {
    this.init();
  }
  init() {}

  *infinite_gen() {
    let i = 1;
    while (true) {
      yield i++;
    }
  }
  gen;
  sqiid() {
    if (!this.gen) this.gen = this.infinite_gen();

    const result = this.gen.next();
    return result.value;
  }

  hash(uppercase = false) {
    // ? hash
    const crypto_hash = Array.from(
      crypto.getRandomValues(new Uint8Array(4)),
      (byte) => ("0" + byte.toString(16)).slice(-2),
    ).join("");

    if (uppercase) return crypto_hash.toUpperCase();

    return crypto_hash;
  }

  uuid4(uppercase = false) {
    // ? guid
    const guid = ([1e7].join() + -1e3 + -4e3 + -8e3 + -1e11).replace(
      /[018]/g,
      (c) =>
        (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16),
    );

    if (uppercase) return guid.toUpperCase();

    return guid;
  }

  iid(
    id,
    prefix = [] /** @paths_help e.g #.svg_canvas/defs/point_marker.selfHdf457K */,
  ) {
    return `#${prefix.join("/")}.${id}_${uid.hash()}`;
  }
}

export const uid = new MakeUID();

/**
 * @typedef {Object} CreateOptions
 * @property {Object<string,string>} [attr] - HTML attributes
 * @property {Object<string,string>} [data] - data-* attributes
 * @property {Object} [private] - Private fields/properties
 * @property {string} [text] - Text content
 * @property {string | HTMLElement | DocumentFragment} [html] - InnerHTML or child
 * @property {Array<HTMLElement>} [children] - Child elements
 * @property {EventListenerOrEventListenerObject} [on] - Event listeners {click: fn}
 */

/**
 * Factory for typed HTML elements with private data
 * @param {string} tag
 * @param {CreateOptions | string | null} [options]
 * @returns {HTMLElement}
 */
export function create_el(tag, options = {}) {
  const el = document.createElement(tag);

  // String options → className
  if (typeof options === "string") {
    el.className = options;
    return el;
  }

  // Attributes
  const {
    attr = {},
    data = {},
    private: priv = {},
    text,
    html,
    children = [],
    on = {},
  } = options;

  Object.entries(attr).forEach(([k, v]) => el.setAttribute(k, v));
  Object.entries(data).forEach(([k, v]) => el.setAttribute(`data-${k}`, v));

  // Private fields (hidden, enumerable false)
  Object.entries(priv).forEach(([k, v]) => {
    Object.defineProperty(el, `_${k}`, {
      value: v,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  });

  // Content
  if (text) el.textContent = text;
  if (html) {
    if (typeof html === "string") el.innerHTML = html;
    else if (html instanceof HTMLElement || html instanceof DocumentFragment) {
      el.appendChild(html);
    }
  }
  children.forEach((child) => el.appendChild(child));

  // Events
  Object.entries(on).forEach(([event, handler]) => {
    el.addEventListener(event, handler);
  });

  return el;
}

// Usage examples:
// /** @type {HTMLElement} */
// const el = create("div", {
//   attr: { id: "foo", tabindex: "0" },
//   data: { path: "/bar", type: "file" },
//   private: {
//     run: () => console.log("k"),
//     data: { hidden: true },
//   },
//   text: "Hello",
//   on: {
//     click: () => el._run(),
//     keydown: (e) => console.log(e.key),
//   },
// });

// Access private: el._run() → 'k'
// Data attrs: el.dataset.path → '/bar'

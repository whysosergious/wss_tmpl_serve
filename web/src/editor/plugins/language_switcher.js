import {
  javascript,
  javascriptLanguage,
  typescriptLanguage,
  jsxLanguage,
  tsxLanguage,
  json,
  jsonLanguage,
  jsonParseLinter,
  css,
  cssLanguage,
  html,
  xml,
  sql,
  StandardSQL,
  MySQL,
  PostgreSQL,
  SQLite,
  MSSQL,
  rust,
  rustLanguage,
  php,
  phpLanguage,
  java,
  javaLanguage,
  cpp,
  cppLanguage,
  yaml,
  yamlLanguage,
  yamlFrontmatter,
  vue,
  vueLanguage,
  wast,
  wastLanguage,
  markdown,
  markdownLanguage,
  Cassandra,
  MariaSQL,
  PLSQL,
  SQLite as SqliteDialect,
  languages as legacy_languages,
  LanguageSupport,
  StreamLanguage,
} from "../pme/pme.mod.js"; // adjust path if needed [web:42][web:49][web:50]

// completions
import { globalCompletions } from "../completions.js"; // your global completion source [web:45]

const ll = new Map();
legacy_languages.forEach((l) => ll.set(l.name, l));

/**
 * @typedef {import('@codemirror/state').Extension[]} LanguageExtensions
 */

/**
 * @type {Record<string, () => LanguageExtensions>}
 */
export const languages = {
  javascript: () => [
    javascript({ jsx: true, typescript: true, autocomplete: true }),
    globalCompletions,
  ],
  typescript: () => [
    javascript({ typescript: true, jsx: false, autocomplete: true }),
    globalCompletions,
  ],
  jsx: () => [
    javascript({ jsx: true, typescript: false, autocomplete: true }),
    globalCompletions,
  ],
  tsx: () => [
    javascript({ jsx: true, typescript: true, autocomplete: true }),
    globalCompletions,
  ],
  json: () => [json({ autocomplete: true }), jsonParseLinter()],
  css: () => [css({ autocomplete: true })],
  html: () => [html.html({ autocomplete: true })],
  xml: () => [xml.xml()],
  sql: () => [sql({ dialect: StandardSQL })],
  mysql: () => [sql({ dialect: MySQL })],
  postgres: () => [sql({ dialect: PostgreSQL })],
  sqlite: () => [sql({ dialect: SQLite })],
  mssql: () => [sql({ dialect: MSSQL })],
  cassandra: () => [sql({ dialect: Cassandra })],
  mariadb: () => [sql({ dialect: MariaSQL })],
  plsql: () => [sql({ dialect: PLSQL })],
  rust: () => [rust({ autocomplete: true })],
  php: () => [php()],
  java: () => [java()],
  cpp: () => [cpp()],
  yaml: () => [yaml()],
  vue: () => [vue()],
  wast: () => [wast()],
  markdown: () => [markdown()],
};

/**
 * Complete 143+ language ext → LanguageSupport mapping
 * @type {Map<string, LanguageSupport | (() => LanguageExtensions)>}
 */
const langCache = new Map();

async function initLangCache() {
  if (langCache.size > 0) return;

  // Modern languages
  const modern = {
    javascript: languages.javascript(),
    typescript: languages.typescript(),
    jsx: languages.jsx(),
    tsx: languages.tsx(),
    json: languages.json(),
    css: languages.css(),
    html: languages.html(),
    xml: languages.xml(),
    rust: languages.rust(),
    php: languages.php(),
    java: languages.java(),
    cpp: languages.cpp(),
    yaml: languages.yaml(),
    vue: languages.vue(),
    wast: languages.wast(),
    markdown: languages.markdown(),
    // ... all your sql variants
  };

  // COMPLETE 143+ ext mappings
  const extMap = new Map([
    // JavaScript/TypeScript (8)
    ["mjs", modern.javascript],
    ["cjs", modern.javascript],
    ["js", modern.javascript],
    ["jsx", modern.jsx],
    ["ts", modern.typescript],
    ["mts", modern.typescript],
    ["cts", modern.typescript],
    ["tsx", modern.tsx],

    // Rust (1)
    ["rs", modern.rust],

    // HTML/XML (6)
    ["html", modern.html],
    ["htm", modern.html],
    ["xhtml", modern.html],
    ["xml", modern.xml],
    ["xsd", modern.xml],
    ["svg", modern.xml],

    // JSON (2)
    ["json", modern.json],
    ["jsonl", modern.json],

    // CSS (4)
    ["css", modern.css],
    ["less", modern.css],
    ["scss", modern.css],
    ["sass", modern.css],

    // PHP (∞)
    ...Array.from({ length: 10 }, (_, i) => [`php${i}`, modern.php]),

    // Java/C/C++ (8)
    ["java", modern.java],
    ["c", modern.cpp],
    ["h", modern.cpp],
    ["cpp", modern.cpp],
    ["hpp", modern.cpp],
    ["cc", modern.cpp],
    ["cxx", modern.cpp],
    ["hh", modern.cpp],

    // YAML/Vue/WASM/Markdown (6)
    ["yaml", modern.yaml],
    ["yml", modern.yaml],
    ["vue", modern.vue],
    ["wat", modern.wast],
    ["wast", modern.wast],
    ["md", modern.markdown],
    ["markdown", modern.markdown],

    // LEGACY LANGUAGES - COMPLETE LIST
    ["py", "Python"],
    ["go", "Go"],
    ["toml", "TOML"],
    ["rb", "Ruby"],
    ["sh", "Shell"],
    ["bash", "Shell"],
    ["zsh", "Shell"],
    ["pl", "Perl"],
    ["lua", "Lua"],
    ["hs", "Haskell"],
    ["scala", "Scala"],
    ["coffee", "CoffeeScript"],
    ["dart", "Dart"],
    ["kt", "Kotlin"],
    ["swift", "Swift"],
    ["jl", "Julia"],
    ["r", "R"],
    ["ps1", "PowerShell"],
    ["dockerfile", "Dockerfile"],
    ["cmake", "CMake"],
    ["nginx", "Nginx"],
    ["tex", "LaTeX"],
    ["latex", "LaTeX"],
    ["groovy", "Groovy"],
    ["clj", "Clojure"],
    ["cljs", "ClojureScript"],
    ["fs", "F#"],
    ["fsx", "F#"],
    ["hx", "Haxe"],
    ["erl", "Erlang"],
    ["ex", "Elixir"],
    ["exs", "Elixir"],
    ["cr", "Crystal"],
    ["ml", "OCaml"],
    ["pas", "Pascal"],
    ["dpr", "Pascal"],
    ["f", "Fortran"],
    ["for", "Fortran"],
    ["f90", "Fortran"],
    ["f95", "Fortran"],
    ["v", "Verilog"],
    ["vhdl", "VHDL"],
    ["sv", "SystemVerilog"],
    ["proto", "ProtoBuf"],
    ["properties", "Properties files"],
    ["pug", "Pug"],
    ["jade", "Pug"],
    ["liquid", "Liquid"],
    ["apl", "APL"],
    ["asn1", "ASN.1"],
    ["asterisk", "Asterisk"],
    ["brainfuck", "Brainfuck"],
    ["cobol", "Cobol"],
    ["cs", "C#"],
    ["cypher", "Cypher"],
    ["cython", "Cython"],
    ["d", "D"],
    ["diff", "diff"],
    ["ecl", "ECL"],
    ["edn", "edn"],
    ["eiffel", "Eiffel"],
    ["elm", "Elm"],
    ["esper", "Esper"],
    ["factor", "Factor"],
    ["forth", "Forth"],
    ["gas", "Gas"],
    ["gherkin", "Gherkin"],
    ["http", "HTTP"],
    ["idl", "IDL"],
    ["jinja2", "Jinja2"],
    ["livescript", "LiveScript"],
    ["mirc", "mIRC"],
    ["mathematica", "Mathematica"],
    ["mbox", "Mbox"],
    ["nsis", "NSIS"],
    ["ntriples", "NTriples"],
    ["objectivec", "Objective-C"],
    ["ocaml", "OCaml"],
    ["octave", "Octave"],
    ["oz", "Oz"],
    ["pig", "Pig"],
    ["puppet", "Puppet"],
    ["q", "Q"],
    ["rpm", "RPM Changes"],
    ["spec", "RPM Spec"],
    ["sieve", "Sieve"],
    ["smalltalk", "Smalltalk"],
    ["solr", "Solr"],
    ["sml", "SML"],
    ["sparql", "SPARQL"],
    ["spreadsheet", "Spreadsheet"],
    ["stylus", "Stylus"],
    ["steX", "sTeX"],
    ["tcl", "Tcl"],
    ["textile", "Textile"],
    ["troff", "Troff"],
    ["ttcn", "TTCN"],
    ["ttcn_cfg", "TTCN_CFG"],
    ["turtle", "Turtle"],
    ["webidl", "Web IDL"],
    ["vb", "VB.NET"],
    ["vbs", "VBScript"],
    ["velocity", "Velocity"],
    ["xquery", "XQuery"],
    ["yacas", "Yacas"],
    ["z80", "Z80"],
    ["mscgen", "MscGen"],
    ["msgenny", "MsGenny"],
  ]);

  // Populate cache
  for (const [ext, langKeyOrName] of extMap) {
    if (typeof langKeyOrName === "string") {
      // Legacy - async load
      const legacyLang = ll.get(langKeyOrName);
      if (legacyLang) {
        const loaded = await legacyLang.loadFunc();
        langCache.set(ext, loaded);
      }
    } else {
      // Modern - sync
      langCache.set(ext, langKeyOrName);
    }
  }
}

let cacheReady = false;
export async function lang_by_ext(ext) {
  if (!cacheReady) {
    await initLangCache();
    cacheReady = true;
  }

  const cached = langCache.get(ext);
  return cached
    ? typeof cached === "function"
      ? cached()
      : [cached]
    : languages.javascript();
}

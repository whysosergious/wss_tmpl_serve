use actix_web::{get, web, HttpResponse, Responder, Result};
use mime_guess::from_path;
use std::{fs, path::PathBuf};

use oxc_allocator::Allocator;
use oxc_codegen::{Codegen, CodegenOptions};
use oxc_parser::Parser;
use oxc_semantic::SemanticBuilder;
use oxc_span::SourceType;
use oxc_transformer::{TransformOptions, Transformer};

const PROJECT_ROOT: &str = "project";
const INJECT_SCRIPTS_DIR: &str = "./inject_scripts";

// ================== BASIC ROUTES ==================

#[get("/")]
async fn index() -> impl Responder {
    match fs::read_to_string("web/main.html") {
        Ok(html) => HttpResponse::Ok().content_type("text/html").body(html),
        Err(_) => HttpResponse::InternalServerError().body("Could not load main.html"),
    }
}

#[get("/project/{filename:.*}")]
async fn project(filename: web::Path<String>) -> Result<HttpResponse> {
    let mut path = PathBuf::from(PROJECT_ROOT).join(filename.as_str());

    if path.is_dir() {
        path.push("index.html");
    }

    if !path.exists() {
        return Ok(HttpResponse::NotFound().body(format!("File not found: {}", path.display())));
    }

    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");

    match ext {
        // ----- TS / TSX / JSX → JS via oxc -----
        "ts" | "tsx" | "jsx" => {
            let source = fs::read_to_string(&path)?;
            let js = transpile_ts_to_js(&source, &path)?;
            Ok(HttpResponse::Ok()
                .content_type("application/javascript")
                .body(js))
        }
        // ----- JS: serve as real JS -----
        "js" => {
            let source = fs::read_to_string(&path)?;
            Ok(HttpResponse::Ok()
                .content_type("application/javascript")
                .body(source))
        }

        // ----- HTML: inject console + HMR into HEAD -----
        "html" => {
            let content = fs::read_to_string(&path)?;

            let head_injection = inject_head_scripts();
            let modified_content =
                content.replace("</head>", &format!("\n{}\n</head>", head_injection));

            Ok(HttpResponse::Ok()
                .content_type("text/html")
                .body(modified_content))
        }

        // ----- Everything else: raw file -----
        _ => {
            let content = fs::read(&path)?;
            let mime_type = from_path(&path).first_or_text_plain();
            Ok(HttpResponse::Ok()
                .content_type(mime_type.as_ref())
                .body(content))
        }
    }
}

fn inject_head_scripts() -> String {
    // lib.js (msgpack) first, then injected scripts
    let mut out = String::new();
    // out.push_str(r#"<script defer src="/src/lib.js"></script>"#);

    if let Ok(dir) = fs::read_dir(INJECT_SCRIPTS_DIR) {
        for entry in dir.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("js") {
                if let Ok(content) = fs::read_to_string(&path) {
                    out.push_str("\n<script type=\"module\">\n");
                    out.push_str(&content);
                    out.push_str("\n</script>");
                }
            }
        }
    }

    out
}

fn transpile_ts_to_js(source: &str, path: &PathBuf) -> Result<String> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(path).unwrap_or_else(|_| SourceType::ts());

    // 1. Parse
    let parse_ret = Parser::new(&allocator, source, source_type).parse();

    if !parse_ret.errors.is_empty() {
        eprintln!("[OXC] Parse errors in {}:", path.display());
        for err in &parse_ret.errors {
            eprintln!("{:?}", err);
        }
    }

    let mut program = parse_ret.program;

    // 2. Semantic info (needed by transformer)
    let semantic_ret = SemanticBuilder::new()
        .with_excess_capacity(2.0)
        .build(&program);

    if !semantic_ret.errors.is_empty() {
        eprintln!("[OXC] Semantic errors in {}:", path.display());
        for err in &semantic_ret.errors {
            eprintln!("{:?}", err);
        }
    }

    let scoping = semantic_ret.semantic.into_scoping();

    // 3. Transform (enable TS/JSX; target esnext by default)
    let options = TransformOptions::enable_all();
    // you can tweak options.typescript / jsx / env here if you want

    let transform_ret = Transformer::new(&allocator, path.as_path(), &options)
        .build_with_scoping(scoping, &mut program);

    if !transform_ret.errors.is_empty() {
        eprintln!("[OXC] Transform errors in {}:", path.display());
        for err in &transform_ret.errors {
            eprintln!("{:?}", err);
        }
    }

    // 4. Emit JS
    let js = Codegen::new()
        .with_options(CodegenOptions::default())
        .build(&program)
        .code;

    Ok(js)
}

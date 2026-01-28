use actix_web::{get, HttpResponse, Responder};
use mime_guess::from_path;
use std::{fs, path::PathBuf};

#[get("/")]
async fn index() -> impl Responder {
    match fs::read_to_string("web/main.html") {
        Ok(html) => HttpResponse::Ok().content_type("text/html").body(html),
        Err(_) => HttpResponse::InternalServerError().body("Could not load main.html"),
    }
}

const PROJECT_ROOT: &str = "project";
const INJECT_SCRIPTS_DIR: &str = "./inject_scripts";

#[get("/project/{filename:.*}")]
async fn project(filename: actix_web::web::Path<String>) -> actix_web::Result<HttpResponse> {
    println!("📁 project() called for: {}", filename); // DEBUG

    let mut path = PathBuf::from(PROJECT_ROOT).join(filename.as_str());
    println!("🔍 Full path: {:?}", path); // DEBUG

    if path.is_dir() {
        path.push("index.html");
        println!("📁 Serving index.html from dir: {:?}", path); // DEBUG
    }

    if !path.exists() {
        println!("❌ File not found: {:?}", path); // DEBUG
        return Ok(HttpResponse::NotFound().body(format!("File not found: {}", path.display())));
    }

    if path.extension().map_or(false, |ext| ext == "html") {
        let content = fs::read_to_string(&path)?;
        println!("📄 HTML file found, size: {} bytes", content.len()); // DEBUG

        let inject_dir = PathBuf::from(INJECT_SCRIPTS_DIR);
        println!("💉 Inject dir exists: {}", inject_dir.exists()); // DEBUG

        let mut injected_scripts = String::new();
        if inject_dir.exists() && inject_dir.is_dir() {
            println!("📂 Reading inject_scripts dir...");
            for entry in fs::read_dir(&inject_dir)? {
                let script_path = entry?.path();
                println!("📄 Script found: {:?}", script_path); // DEBUG

                if script_path.extension().map_or(false, |ext| ext == "js") {
                    let script_content = fs::read_to_string(&script_path)?;
                    println!(
                        "✅ Injected {} bytes from {}",
                        script_content.len(),
                        script_path.display()
                    );
                    injected_scripts.push_str(&format!(r#"<script>{}</script>"#, script_content));
                }
            }
        } else {
            println!(
                "⚠️  inject_scripts dir missing or not dir: {:?}",
                inject_dir
            );
        }

        println!("💉 Total injected: {} bytes", injected_scripts.len());

        let modified_content =
            content.replace("</body>", &format!("{}{}</body>", injected_scripts, ""));

        println!("✅ Response sent with injection"); // DEBUG
        Ok(HttpResponse::Ok()
            .content_type("text/html")
            .body(modified_content))
    } else {
        println!("📄 Non-HTML, serving raw: {:?}", path); // DEBUG
        let content = fs::read(&path)?;
        let mime_type = from_path(&path).first_or_text_plain();
        Ok(HttpResponse::Ok()
            .content_type(mime_type.as_ref())
            .body(content))
    }
}

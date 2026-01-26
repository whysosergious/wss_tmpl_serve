use mime_guess::from_path;
use std::{fs, path::PathBuf};

use actix_web::{get, HttpResponse, Responder};

#[get("/")]
async fn index() -> impl Responder {
    match fs::read_to_string("web/main.html") {
        Ok(html) => HttpResponse::Ok().content_type("text/html").body(html),
        Err(_) => HttpResponse::InternalServerError().body("Could not load main.html"),
    }
}

const PROJECT_ROOT: &str = "project";

#[get("/project/{filename:.*}")]
async fn project(filename: actix_web::web::Path<String>) -> actix_web::Result<HttpResponse> {
    // Return concrete HttpResponse
    let mut path = PathBuf::from(PROJECT_ROOT).join(filename.as_str());

    // If the path is a directory, try to serve index.html within it
    if path.is_dir() {
        path.push("index.html");
    }

    if !path.exists() {
        return Ok(HttpResponse::NotFound().body(format!("File not found: {}", path.display())));
    }

    if path.extension().map_or(false, |ext| ext == "html") {
        let content = fs::read_to_string(&path)?;
        let injected_script =
            r#"<script type="module" src="/web/src/preview/injected_hym_client.js"></script>"#;
        let modified_content = content.replace("</body>", &format!("{}</body>", injected_script));
        Ok(HttpResponse::Ok()
            .content_type("text/html")
            .body(modified_content))
    } else {
        let content = fs::read(&path)?; // Read content as bytes
        let mime_type = from_path(&path).first_or_text_plain();
        Ok(HttpResponse::Ok()
            .content_type(mime_type.as_ref())
            .body(content))
    }
}

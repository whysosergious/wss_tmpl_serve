use std::env;

use actix_files::Files;
use actix_web::{middleware::Logger, web, App, HttpServer};
use dotenv::dotenv;
use std::sync::{Arc, Mutex};
// local modules
mod cmd;
mod http;
mod ws;

use http::routes::index;
use ws::connection::{handler, Clients};

#[tokio::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env::set_var("RUST_LOG", "info");
    let clients: Clients = Arc::new(Mutex::new(Vec::new()));
    env_logger::init();

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("{}:{}", host, port);

    println!("Starting WebSocket server at ws://{}/ws/", addr);

    HttpServer::new(move || {
        App::new()
            //.configure(configure)
            .service(Files::new("/web", "./web"))
            .service(index)
            .wrap(Logger::default())
            .app_data(web::Data::new(clients.clone()))
            .route("/ws/", web::get().to(handler))
    })
    .bind(addr)?
    .run()
    .await
}

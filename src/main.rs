use std::collections::HashMap;
use std::env;

use actix_files::Files;
use actix_web::{middleware::Logger, web, App, HttpServer};
use dotenv::dotenv;
use once_cell::sync::OnceCell;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

// local modules
mod cmd;
mod http;
mod watcher;
mod ws;

use http::routes::{index, project};
use watcher::start_watcher;
use ws::connection::{handler, start_watcher_event_broadcast, Clients, WatcherEvent};

// Use OnceCell to ensure the broadcast task is spawned only once
static BROADCAST_TASK_SPAWNED: OnceCell<()> = OnceCell::new();

#[tokio::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env::set_var("RUST_LOG", "info");
    let clients: Clients = Arc::new(Mutex::new(HashMap::new()));
    env_logger::init();

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("{}:{}", host, port);

    let mut project_path = "./".to_string(); // The directory to watch
    let canonical_project_path = match std::fs::canonicalize(&project_path) {
        Ok(path) => path.to_string_lossy().to_string(),
        Err(e) => {
            eprintln!(
                "Failed to canonicalize project path {}: {}",
                project_path, e
            );
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to canonicalize project path",
            ));
        }
    };
    project_path = canonical_project_path.clone(); // Use the canonical path from now on

    let (watcher_tx, watcher_rx) = mpsc::unbounded_channel::<WatcherEvent>();
    // Wrap the receiver in an Arc<Mutex<Option<_>>> to allow it to be moved into the closure
    // and safely taken out once.
    let shared_watcher_rx = Arc::new(Mutex::new(Some(watcher_rx)));

    // Start the file watcher. It will send events to watcher_tx.
    let _watcher = match start_watcher(project_path.clone(), watcher_tx.clone()) {
        Ok(watcher) => {
            println!("Started file watcher in: {}", project_path);
            watcher
        }
        Err(e) => {
            eprintln!("Failed to start file watcher: {}", e);
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to start file watcher",
            ));
        }
    };

    println!("Starting WebSocket server at ws://{}/ws/", addr);

    HttpServer::new(move || {
        // Clone for this closure instance
        let clients_clone_for_factory = clients.clone();
        let shared_watcher_rx_clone_for_factory = shared_watcher_rx.clone();

        // Ensure the broadcast task is spawned only once per process
        BROADCAST_TASK_SPAWNED.get_or_init(move || {
            // move the clones into get_or_init
            let rx_option = shared_watcher_rx_clone_for_factory.lock().unwrap().take();
            if let Some(rx) = rx_option {
                start_watcher_event_broadcast(rx, web::Data::new(clients_clone_for_factory));
            } else {
                // This should theoretically not happen if get_or_init is called only once
                eprintln!("Watcher receiver was already taken, broadcast task not started.");
            }
            () // Return unit type
        });

        App::new()
            .service(Files::new("/web", "./web"))
            .service(index)
            // .service(Files::new("/project", project_path.clone()))
            .service(project)
            .wrap(Logger::default())
            .app_data(web::Data::new(clients.clone()))
            .route("/ws/", web::get().to(handler))
    })
    .bind(addr)?
    .run()
    .await
}

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf}; // Import PathBuf
use tokio::sync::mpsc;
use crate::ws::connection::WatcherEvent; // Import WatcherEvent

#[derive(Debug)] // Add Debug for easier debugging
pub enum WatcherMessage {
    Reload(String),
    CssUpdate(String),
}

pub fn start_watcher(
    project_path: String,
    tx: mpsc::UnboundedSender<WatcherEvent>, // Change type to WatcherEvent
) -> Result<RecommendedWatcher, Box<dyn std::error::Error>> {
    println!("[Watcher] Starting watcher for path: {}", project_path);

    // Select debouncer timeouts.
    let config = Config::default()
        .with_poll_interval(std::time::Duration::from_secs(1))
        .with_compare_contents(true);

    let project_path_for_closure = project_path.clone(); // Clone for the closure
    let project_path_obj = PathBuf::from(&project_path_for_closure); // Convert to PathBuf once

    let mut watcher = RecommendedWatcher::new(
        move |event: Result<notify::Event, notify::Error>| {
            let tx = tx.clone();
            match event {
                Ok(event) => {
                    println!("[Watcher] Received event: {:?}", event);
                    // Filter out events that are not related to file changes or are from ignored directories
                    if event.kind.is_modify()
                        || event.kind.is_create()
                        || event.kind.is_remove()
                    {
                        for path in event.paths {
                            println!("[Watcher] Processing path: {:?}", path); // Use {:?} for Path
                            // Check if the path is within the project directory
                            if let Ok(relative_path_buf) = path.strip_prefix(&project_path_obj) { // Use strip_prefix
                                let relative_path = relative_path_buf.to_string_lossy().to_string();

                                let watcher_event = if relative_path.ends_with(".css") {
                                    WatcherEvent::CssUpdate { path: relative_path.clone() }
                                } else if relative_path.ends_with(".html")
                                    || relative_path.ends_with(".js")
                                {
                                    WatcherEvent::Reload { path: relative_path.clone() }
                                } else {
                                    println!("[Watcher] Ignoring non-relevant file type: {}", relative_path);
                                    continue; // Ignore other file types
                                };
                                println!("[Watcher] Sending event to broadcast: {:?}", watcher_event);
                                let _ = tx.send(watcher_event); // Use send for unbounded sender
                            } else {
                                println!("[Watcher] Path not within project directory: {:?}", path);
                            }
                        }
                    } else {
                        println!("[Watcher] Ignoring event kind: {:?}", event.kind);
                    }
                },
                Err(e) => println!("[Watcher] Watch error: {:?}", e),
            }
        },
        config,
    )?;

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored.
    watcher.watch(Path::new(&project_path), RecursiveMode::Recursive)?; // project_path is still available here
    println!("[Watcher] Successfully set up watch for: {}", project_path);

    Ok(watcher)
}
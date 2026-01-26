use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
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
    // Select debouncer timeouts.
    let config = Config::default()
        .with_poll_interval(std::time::Duration::from_secs(1))
        .with_compare_contents(true);

    let project_path_for_closure = project_path.clone(); // Clone for the closure

    let mut watcher = RecommendedWatcher::new(
        move |event: Result<notify::Event, notify::Error>| {
            let tx = tx.clone();
            if let Ok(event) = event {
                // Filter out events that are not related to file changes or are from ignored directories
                if event.kind.is_modify()
                    || event.kind.is_create()
                    || event.kind.is_remove()
                {
                    for path in event.paths {
                        let path_str = path.to_string_lossy().to_string();
                        // Check if the path is within the project directory
                        if path_str.starts_with(&project_path_for_closure) { // Use the cloned path
                            let relative_path = path_str.replacen(&project_path_for_closure, "", 1);

                            let watcher_event = if relative_path.ends_with(".css") {
                                WatcherEvent::CssUpdate { path: relative_path }
                            } else if relative_path.ends_with(".html")
                                || relative_path.ends_with(".js")
                            {
                                WatcherEvent::Reload { path: relative_path }
                            } else {
                                continue; // Ignore other file types
                            };
                            let _ = tx.send(watcher_event); // Use send for unbounded sender
                        }
                    }
                }
            }
        },
        config,
    )?;

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored.
    watcher.watch(Path::new(&project_path), RecursiveMode::Recursive)?; // project_path is still available here

    Ok(watcher)
}
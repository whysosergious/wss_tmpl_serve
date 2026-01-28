use crate::ws::connection::WatcherEvent;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

// Thread-safe debounce tracker
lazy_static::lazy_static! {
    static ref DEBOUNCE_MAP: Arc<Mutex<HashMap<String, Instant>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

pub fn start_watcher(
    project_path: String,
    tx: mpsc::UnboundedSender<WatcherEvent>,
) -> Result<RecommendedWatcher, Box<dyn std::error::Error>> {
    println!("[Watcher] Starting watcher for path: {}", project_path);

    let config = Config::default()
        .with_poll_interval(Duration::from_secs(1))
        .with_compare_contents(true);

    let project_path_for_closure = project_path.clone();
    let project_path_obj = PathBuf::from(&project_path_for_closure);
    let debounce_map = Arc::clone(&DEBOUNCE_MAP);
    let tx_clone = tx.clone();

    let mut watcher = RecommendedWatcher::new(
        move |event: Result<notify::Event, notify::Error>| {
            let tx = tx_clone.clone();
            match event {
                Ok(event) => {
                    println!("[Watcher] Event: {:?}", event.kind);

                    if event.kind.is_modify() || event.kind.is_create() || event.kind.is_remove() {
                        for path in event.paths {
                            println!("[Watcher] Path: {:?}", path);

                            if let Ok(relative_path_buf) = path.strip_prefix(&project_path_obj) {
                                let relative_path = relative_path_buf.to_string_lossy().to_string();

                                // DEBOUNCE CHECK
                                let debounce_key = format!("{:?}", path);
                                let now = Instant::now();
                                let debounce_duration = Duration::from_millis(250);

                                {
                                    let mut map_guard = debounce_map.lock().unwrap();
                                    if let Some(&last_time) = map_guard.get(&debounce_key) {
                                        if now.duration_since(last_time) < debounce_duration {
                                            println!("[Watcher] ⏸️  Debounced: {}", relative_path);
                                            continue;
                                        }
                                    }
                                    map_guard.insert(debounce_key, now);
                                } // Lock released here

                                let watcher_event = if relative_path.ends_with(".css") {
                                    WatcherEvent::HmrCssUpdate {
                                        path: relative_path.clone(),
                                    }
                                } else if relative_path.ends_with(".js")
                                    || relative_path.ends_with(".mjs")
                                    || relative_path.ends_with(".jsx")
                                    || relative_path.ends_with(".ts")
                                    || relative_path.ends_with(".mts")
                                    || relative_path.ends_with(".tsx")
                                {
                                    WatcherEvent::HmrJsUpdate {
                                        path: relative_path.clone(),
                                    }
                                } else if relative_path.ends_with(".html") {
                                    WatcherEvent::HmrReload {
                                        path: relative_path.clone(),
                                    }
                                } else {
                                    println!("[Watcher] Ignoring: {}", relative_path);
                                    continue;
                                };

                                println!("[Watcher] 🚀 Sending: {:?}", watcher_event);
                                let _ = tx.send(watcher_event);
                            }
                        }
                    }
                }
                Err(e) => println!("[Watcher] Error: {:?}", e),
            }
        },
        config,
    )?;

    watcher.watch(Path::new(&project_path), RecursiveMode::Recursive)?;
    println!("[Watcher] ✅ Watching: {}", project_path);

    Ok(watcher)
}

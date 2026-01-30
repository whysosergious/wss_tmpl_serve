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
                    if event.kind.is_modify() || event.kind.is_create() || event.kind.is_remove() {
                        for path in event.paths {
                            let full_target = project_path_obj.join("target");
                            if path.starts_with(&full_target) {
                                // println!("[Watcher] Ignoring target dir: {:?}", path);
                                continue;
                            }

                            println!("[Watcher] Event: {:?}", event.kind);
                            println!("[Watcher] Path: {:?}", path);

                            if let Ok(relative_path_buf) = path.strip_prefix(&project_path_obj) {
                                let relative_path = relative_path_buf.to_string_lossy().to_string();

                                // Ignore editor temp/swap files by pattern
                                let filename = Path::new(&relative_path)
                                    .file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("");

                                if filename.ends_with('~')
                                    || filename.ends_with(".swp")
                                    || filename.ends_with(".swo")
                                    || filename.ends_with(".tmp")
                                    || filename.parse::<u32>().is_ok()
                                // pure numbers like "4913"
                                {
                                    println!("[Watcher] Ignoring temp/swap: {}", relative_path);
                                    continue;
                                }

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
                                    WatcherEvent::NotifyUpdate {
                                        path: relative_path.clone(),
                                    }
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

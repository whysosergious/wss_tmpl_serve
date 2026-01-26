use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::{handle, Message, Session};
use bytes::Bytes;
use futures_util::StreamExt;
use log::error;
use rmp_serde::{Deserializer, Serializer};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Cursor;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc, Mutex,
};
use tokio::sync::mpsc;

use crate::cmd::nu::execute_command;
use crate::watcher::WatcherMessage; // Import WatcherMessage from the watcher module

#[derive(Deserialize)]
struct ClientMessage {
    r#type: String,
    body: String,
    msg_id: String,
}

#[derive(Serialize, Clone)]
#[serde(untagged)] // Allows for flexible deserialization without a top-level tag
enum WsMessage {
    Server(ServerMessage),
    Watcher(WatcherEvent),
}

#[derive(Serialize, Clone, Debug)]
pub enum WatcherEvent {
    Reload { path: String },
    CssUpdate { path: String },
}

impl From<WatcherMessage> for WatcherEvent {
    fn from(msg: WatcherMessage) -> Self {
        match msg {
            WatcherMessage::Reload(path) => WatcherEvent::Reload { path },
            WatcherMessage::CssUpdate(path) => WatcherEvent::CssUpdate { path },
        }
    }
}

#[derive(Serialize, Clone)]
struct ServerMessage {
    r#type: String,
    body: String,
    id: usize,
    msg_id: String,
}

pub type Tx = mpsc::UnboundedSender<Message>;
pub type Clients = Arc<Mutex<HashMap<usize, Tx>>>;

/// Used to assign unique IDs to clients.
static NEXT_CLIENT_ID: AtomicUsize = AtomicUsize::new(1);

// This function will be spawned as a separate task to broadcast watcher events
pub fn start_watcher_event_broadcast(
    mut rx: mpsc::UnboundedReceiver<WatcherEvent>,
    clients: web::Data<Clients>,
) {
    actix_web::rt::spawn(async move {
        println!("[Broadcast] Watcher event broadcast task started.");
        while let Some(event) = rx.recv().await {
            println!("[Broadcast] Received WatcherEvent: {:?}", event);
            let mut buf = Vec::new();
            if let Err(e) = WsMessage::Watcher(event.clone()).serialize(&mut rmp_serde::Serializer::new(&mut buf)) {
                error!("Failed to serialize watcher event: {}", e);
                continue;
            }
            let bytes = Bytes::from(buf);

            let guard = clients.lock().unwrap();
            println!("[Broadcast] Attempting to send event to {} clients.", guard.len());
            for (client_id, client) in guard.iter() {
                if let Err(e) = client.send(Message::Binary(bytes.clone())) {
                    error!("Failed to send watcher event to client {}: {}", client_id, e);
                } else {
                    println!("[Broadcast] Sent event to client {}", client_id);
                }
            }
        }
        println!("[Broadcast] Watcher event broadcast task finished.");
    });
}


async fn handle_binary_message(
    id: usize,
    bin: Bytes,
    session: &mut Session,
    clients: &web::Data<Clients>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut de = Deserializer::new(Cursor::new(&bin));
    match ClientMessage::deserialize(&mut de) {
        Ok(client_msg) if client_msg.r#type == "cmd" => {
            println!("{:?} =>", client_msg.body);
            match execute_command(&client_msg.body).await {
                Ok(out) => {
                    println!("{}", out);

                    let mut buf = Vec::new();
                    let mut reply_map = HashMap::new();
                    reply_map.insert("type".to_string(), "cmd_result".to_string());
                    reply_map.insert("body".to_string(), out);
                    reply_map.insert("msg_id".to_string(), client_msg.msg_id);
                    reply_map.serialize(&mut Serializer::new(&mut buf))?;
                    session.binary(buf).await?;
                }
                Err(e) => {
                    error!("execute_command fault: {}", e);
                    return Err(Box::new(e));
                }
            }
        }
        Ok(client_msg) if client_msg.r#type == "broadcast" => {
            let mut buf = Vec::new();
            let broadcast = WsMessage::Server(ServerMessage {
                r#type: "broadcast".into(),
                body: client_msg.body.clone(),
                id,
                msg_id: client_msg.msg_id.clone(),
            });
            broadcast.serialize(&mut Serializer::new(&mut buf))?;
            let bytes = Bytes::from(buf);

            let guard = clients.lock().unwrap();
            for (client_id, client) in guard.iter() {
                if *client_id != id {
                    if let Err(e) = client.send(Message::Binary(bytes.clone())) {
                        error!("broadcast failed: {}", e);
                    }
                }
            }
        }
        Ok(other) => {
            error!("unknown msg type: {}", other.r#type);
        }
        Err(e) => {
            error!("deserialize error: {}", e);
            return Err(e.into());
        }
    }
    Ok(())
}

pub async fn handler(
    req: HttpRequest,
    payload: web::Payload,
    clients: web::Data<Clients>,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = handle(&req, payload)?;
    let (tx, mut rx) = mpsc::unbounded_channel();
    let id = NEXT_CLIENT_ID.fetch_add(1, Ordering::Relaxed);
    clients.lock().unwrap().insert(id, tx);
    let clients_clone = clients.clone();

    actix_web::rt::spawn(async move {
        loop {
            tokio::select! {
                Some(Ok(msg)) = msg_stream.next() => match msg {
                    Message::Binary(bin) => {
                        if handle_binary_message(id, bin, &mut session, &clients_clone).await.is_err() {
                            break;
                        }
                    }
                    Message::Close(reason) => { let _ = session.close(reason).await; break; }
                    Message::Ping(p)    => { let _ = session.pong(&p).await; }
                    Message::Pong(_)    | Message::Text(_) | Message::Continuation(_) | Message::Nop => {}
                },
                Some(out_msg) = rx.recv() => match out_msg {
                    Message::Binary(bin) => {
                        if let Err(e) = session.binary(bin).await {
                            error!("outgoing binary failed: {}", e);
                            break;
                        }
                    }
                    Message::Text(txt) => {
                        if let Err(e) = session.text(txt).await {
                            error!("outgoing text failed: {}", e);
                            break;
                        }
                    }
                    Message::Close(c) => { let _ = session.close(c).await; break; }
                    Message::Ping(p)  => { let _ = session.ping(&p).await; }
                    Message::Pong(p)  => { let _ = session.pong(&p).await; }
                    _ => {}
                },
                else => break,
            }
        }
        clients_clone.lock().unwrap().remove(&id);
    });
    Ok(response)
}

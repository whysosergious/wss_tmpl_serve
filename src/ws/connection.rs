use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::{handle, Message, Session};
use bytes::Bytes;
use futures_util::StreamExt;
use log::error;
use rmp_serde::{Deserializer, Serializer};
use serde::{Deserialize, Serialize};
use std::collections::HashMap; // Import HashMap
use std::io::Cursor;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

use crate::cmd::nu::execute_command; // ensure this is imported :contentReference[oaicite:3]{index=3}

#[derive(Deserialize)]
struct ClientMessage {
    r#type: String,
    body: String,
}

#[derive(Serialize)]
struct ServerMessage {
    r#type: String,
    body: String,
}

pub type Tx = mpsc::UnboundedSender<Message>;
pub type Clients = Arc<Mutex<Vec<Tx>>>;

async fn handle_binary_message(
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
            let broadcast = ServerMessage {
                r#type: "broadcast".into(),
                body: client_msg.body.clone(),
            };
            broadcast.serialize(&mut Serializer::new(&mut buf))?;
            let bytes = Bytes::from(buf);
            let guard = clients.lock().unwrap();
            for client in guard.iter() {
                if let Err(e) = client.send(Message::Binary(bytes.clone())) {
                    error!("broadcast failed: {}", e);
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
    // 1) Perform the WebSocket handshake & split out the session and message stream
    let (response, mut session, mut msg_stream) = handle(&req, payload)?;
    let (tx, mut rx) = mpsc::unbounded_channel();
    clients.lock().unwrap().push(tx.clone());
    let clients_clone = clients.clone();

    // 2) Spawn the read/write loop
    actix_web::rt::spawn(async move {
        loop {
            tokio::select! {
                // Incoming from client:
                Some(Ok(msg)) = msg_stream.next() => match msg {
                    Message::Binary(bin) => {
                        if handle_binary_message(bin, &mut session, &clients_clone).await.is_err() {
                            break;
                        }
                    }
                    Message::Close(reason) => { let _ = session.close(reason).await; break; }
                    Message::Ping(p)    => { let _ = session.pong(&p).await; }
                    Message::Pong(_)    | Message::Text(_) | Message::Continuation(_) | Message::Nop => {}
                },

                // Outgoing via our channel:
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

                else => break, // both streams closed
            }
        }

        // 3) Clean up disconnected client
        clients_clone
            .lock()
            .unwrap()
            .retain(|c| !c.same_channel(&tx));
    });

    // 4) Return the handshake response
    Ok(response)
}

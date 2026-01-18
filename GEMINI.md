# Project: wss_serve

## Project Overview

This project is a web application that provides a terminal-like interface in the browser. It uses a WebSocket connection to a Rust-based backend server to execute commands and display the output in real-time.

**Technologies:**

*   **Backend:** Rust, Actix-web (for HTTP and WebSockets), Serde (for serialization), RMP-Serde (for MessagePack).
*   **Frontend:** Vanilla JavaScript, Web Components.

**Architecture:**

The application consists of two main parts:

1.  **Backend Server:** A Rust application built with Actix-web that serves the frontend files and handles WebSocket connections. When a command is received from a client via WebSocket, it executes the command and sends the output back to the client.

2.  **Frontend Web Application:** A single-page application built with vanilla JavaScript and Web Components. It provides a terminal-like interface where users can type commands and see the output. The frontend communicates with the backend via a WebSocket connection.

## Building and Running

### Prerequisites

*   Rust (latest stable version)
*   `wasm-pack` (for building the frontend)

### Backend

To build and run the backend server:

```bash
# From the project root directory
cargo run
```

The server will start on `127.0.0.1:8080` by default. You can change the host and port by setting the `HOST` and `PORT` environment variables.

### Frontend

The frontend is served automatically by the backend server. No separate build step is required for the frontend.

## Development Conventions

*   **Backend:** The backend code is located in the `src` directory. It follows standard Rust conventions.
*   **Frontend:** The frontend code is located in the `web` directory. It uses vanilla JavaScript and Web Components.
*   **Communication:** The client and server communicate using MessagePack-encoded binary messages over a WebSocket connection. The message format is defined in `src/ws/connection.rs`.
